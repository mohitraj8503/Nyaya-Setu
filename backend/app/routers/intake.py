import base64
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from backend.app.database import get_db
from backend.app.schemas.complaint import ComplaintIntakeRequest, ComplaintIntakeResponse, ClarificationAnswerRequest
from backend.app.ai.pipeline import ai_pipeline
from backend.app.services.jurisdiction_service import jurisdiction_service
from backend.app.services.routing_engine import routing_engine
from backend.app.services.case_service import case_service
from backend.app.services.sla_service import sla_service
from backend.app.models.models import Case

router = APIRouter(prefix="/v2/complaints", tags=["v2-complaints"])

@router.post("", response_model=ComplaintIntakeResponse)
async def process_complaint_intake(payload: ComplaintIntakeRequest, db: Session = Depends(get_db)):
    """
    Multimodal grievance intake endpoint.
    Accepts text or audio, resolves Indian administrative jurisdiction,
    runs AI classification and fact extraction, determines competent authority,
    and returns a structured review payload.
    """
    # 1. Resolve Location & Jurisdiction
    loc_input = payload.location.model_dump() if payload.location else {}
    resolved_loc = jurisdiction_service.resolve(
        lat=loc_input.get("lat"),
        lng=loc_input.get("lng"),
        pincode=loc_input.get("pincode"),
        address=loc_input.get("address")
    )
    
    # 2. Process audio if provided
    audio_bytes = None
    if payload.audio_base64:
        try:
            audio_bytes = base64.b64decode(payload.audio_base64)
        except Exception:
            pass
            
    # 3. Execute AI Intelligence Pipeline
    ai_result = await ai_pipeline.process_intake(
        text=payload.text,
        audio_bytes=audio_bytes,
        language=payload.language or "hi",
        location=resolved_loc,
        citizen_name=payload.name or "Citizen"
    )
    
    # If PIN code was discovered in text and not in location, re-resolve location
    if ai_result.get("pincode_found") and not loc_input.get("pincode"):
        resolved_loc = jurisdiction_service.resolve(pincode=ai_result["pincode_found"])
        
    # 4. Execute Dynamic Routing Engine
    routing_result = routing_engine.route(
        db=db,
        category=ai_result["category"],
        jurisdiction=resolved_loc,
        severity=ai_result["severity"]
    )
    
    # 5. Calculate SLA deadline
    sla_deadline = sla_service.calculate_deadline(ai_result["category"])
    
    # 6. Create Case in database
    case = case_service.create_case(
        db=db,
        raw_input={
            "type": payload.input_type,
            "language": ai_result["language"],
            "text": ai_result["raw_text"],
            "phone": payload.phone,
            "name": payload.name
        },
        normalized={
            "summary": ai_result["summary"],
            "category": ai_result["category"],
            "category_name": ai_result["category_name"],
            "domain": ai_result["domain"],
            "severity": ai_result["severity"],
            "entities": ai_result["entities"],
            "evidence_mentioned": ai_result["evidence_mentioned"]
        },
        ai_confidence={
            "classification": ai_result["confidence"],
            "jurisdiction": routing_result["confidence"]["jurisdiction"],
            "authority": routing_result["confidence"]["authority_match"],
            "overall": routing_result["confidence"]["overall"]
        },
        location=resolved_loc,
        department=routing_result["department"],
        authority_id=routing_result["authority_id"],
        channel=routing_result["channel"],
        complaint_text=ai_result["drafts"]["local"],
        complaint_text_en=ai_result["drafts"]["en"],
        sla_deadline=sla_deadline,
        actor_type="CITIZEN"
    )
    
    return ComplaintIntakeResponse(
        case_id=case.case_id,
        status=case.status,
        analysis={
            "language": ai_result["language"],
            "summary": ai_result["summary"],
            "category": ai_result["category"],
            "subcategory": None,
            "severity": ai_result["severity"],
            "entities": ai_result["entities"],
            "location_clues": ai_result["location_clues"],
            "evidence_mentioned": ai_result["evidence_mentioned"],
            "requested_action": "Inspection & time-bound rectification",
            "clarification_needed": ai_result["clarification_needed"],
            "clarification_question": ai_result["clarification_question"],
            "confidence": ai_result["confidence"]
        },
        routing=routing_result,
        complaint_draft=ai_result["drafts"],
        location=resolved_loc,
        requires_clarification=ai_result["clarification_needed"],
        clarification_question=ai_result["clarification_question"]
    )

@router.post("/clarify")
async def answer_clarification(payload: ClarificationAnswerRequest, db: Session = Depends(get_db)):
    """Answer single clarification question to refine classification and draft."""
    case = case_service.get_case_by_case_id(db, payload.case_id)
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
        
    # Append citizen clarification answer to raw input
    current_text = case.raw_input.get("text", "")
    updated_text = f"{current_text}. [Clarification: {payload.answer}]"
    
    ai_result = await ai_pipeline.process_intake(
        text=updated_text,
        language=case.raw_input.get("language", "hi"),
        location=case.location,
        case_id=case.case_id
    )
    
    # Update Case
    case.raw_input = {**case.raw_input, "text": updated_text, "clarification_answer": payload.answer}
    case.normalized = {
        **case.normalized,
        "summary": ai_result["summary"],
        "category": ai_result["category"],
        "severity": ai_result["severity"]
    }
    case.complaint_text = ai_result["drafts"]["local"]
    case.complaint_text_en = ai_result["drafts"]["en"]
    
    # Log CLARIFIED event
    case_service.log_event(
        db=db,
        case_id=case.id,
        event_type="CLARIFIED",
        event_data={"answer": payload.answer, "updated_category": ai_result["category"]},
        actor_type="CITIZEN"
    )
    db.commit()
    db.refresh(case)
    
    return {
        "case_id": case.case_id,
        "status": case.status,
        "updated_analysis": ai_result,
        "updated_draft": ai_result["drafts"],
        "clarification_resolved": True
    }
