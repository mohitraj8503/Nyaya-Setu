from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from backend.app.database import get_db
from backend.app.schemas.case import CaseDetailOut, CaseListOut, CaseEventOut
from backend.app.schemas.complaint import SubmitComplaintRequest
from backend.app.services.case_service import case_service
from backend.app.services.submission_service import submission_service
from backend.app.services.escalation_service import escalation_service
from backend.app.models.models import Case

router = APIRouter(prefix="/v2/cases", tags=["v2-cases"])

@router.get("", response_model=CaseListOut)
def list_cases(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    status: Optional[str] = None,
    category: Optional[str] = None,
    db: Session = Depends(get_db)
):
    cases, total = case_service.list_cases(db, skip=skip, limit=limit, status=status, category=category)
    return CaseListOut(
        cases=[CaseDetailOut.model_validate(c) for c in cases],
        total=total,
        page=(skip // limit) + 1,
        limit=limit
    )

@router.get("/{case_id}", response_model=CaseDetailOut)
def get_case(case_id: str, db: Session = Depends(get_db)):
    case = case_service.get_case_by_case_id(db, case_id)
    if not case:
        case = case_service.get_case_by_id(db, case_id)
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    return CaseDetailOut.model_validate(case)

@router.get("/{case_id}/timeline", response_model=List[CaseEventOut])
def get_case_timeline(case_id: str, db: Session = Depends(get_db)):
    case = case_service.get_case_by_case_id(db, case_id)
    if not case:
        case = case_service.get_case_by_id(db, case_id)
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    return [CaseEventOut.model_validate(ev) for ev in case.events]

@router.post("/{case_id}/submit")
async def submit_case(
    case_id: str,
    payload: SubmitComplaintRequest,
    db: Session = Depends(get_db)
):
    case = case_service.get_case_by_case_id(db, case_id)
    if not case:
        case = case_service.get_case_by_id(db, case_id)
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
        
    result = await submission_service.execute_submission(
        db=db,
        case=case,
        channel_override=payload.channel
    )
    return result

@router.post("/{case_id}/escalate")
def escalate_case(
    case_id: str,
    reason: Optional[str] = "Manual escalation request",
    db: Session = Depends(get_db)
):
    case = case_service.get_case_by_case_id(db, case_id)
    if not case:
        case = case_service.get_case_by_id(db, case_id)
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
        
    result = escalation_service.escalate_case(db=db, case=case, reason=reason)
    return result
