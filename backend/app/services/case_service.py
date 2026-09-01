from datetime import datetime
from typing import Optional, Dict, Any, List, Tuple
from sqlalchemy.orm import Session
from backend.app.models.models import Case, CaseEvent, User
from backend.app.utils.tracking import generate_case_id
from backend.app.utils.sanitize import sanitize_payload

VALID_STATUS_FLOW = {
    "DRAFT": ["AI_REVIEW", "ROUTE_CONFIRMED"],
    "AI_REVIEW": ["ROUTE_CONFIRMED", "DRAFT"],
    "ROUTE_CONFIRMED": ["READY_TO_SUBMIT", "SUBMITTED"],
    "READY_TO_SUBMIT": ["SUBMITTED", "DRAFT"],
    "SUBMITTED": ["ACKNOWLEDGED", "ASSIGNED", "IN_PROGRESS"],
    "ACKNOWLEDGED": ["ASSIGNED", "IN_PROGRESS"],
    "ASSIGNED": ["IN_PROGRESS", "RESOLVED"],
    "IN_PROGRESS": ["RESOLVED", "ASSIGNED"],
    "RESOLVED": ["CITIZEN_CONFIRMED", "CLOSED", "IN_PROGRESS"],
    "CITIZEN_CONFIRMED": ["CLOSED"],
    "CLOSED": []
}

class CaseService:
    def create_case(
        self,
        db: Session,
        raw_input: Dict[str, Any],
        normalized: Dict[str, Any],
        ai_confidence: Dict[str, Any],
        location: Dict[str, Any],
        department: Optional[str] = None,
        authority_id: Optional[str] = None,
        channel: str = "PORTAL",
        complaint_text: Optional[str] = None,
        complaint_text_en: Optional[str] = None,
        citizen_id: Optional[str] = None,
        sla_deadline: Optional[datetime] = None,
        actor_type: str = "CITIZEN"
    ) -> Case:
        """Create a new Case record and log the initial CREATED event."""
        case_id = generate_case_id()
        
        case = Case(
            case_id=case_id,
            citizen_id=citizen_id,
            status="ROUTE_CONFIRMED",
            raw_input=sanitize_payload(raw_input),
            normalized=sanitize_payload(normalized),
            ai_confidence=ai_confidence,
            location=sanitize_payload(location),
            department=department,
            authority_id=authority_id,
            channel=channel,
            complaint_text=complaint_text,
            complaint_text_en=complaint_text_en,
            sla_deadline=sla_deadline,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        db.add(case)
        db.flush()
        
        # Log CREATED event
        self.log_event(
            db=db,
            case_id=case.id,
            event_type="CREATED",
            event_data={"summary": normalized.get("summary"), "category": normalized.get("category")},
            actor_type=actor_type,
            actor_id=citizen_id
        )
        
        # Log CLASSIFIED event
        self.log_event(
            db=db,
            case_id=case.id,
            event_type="CLASSIFIED",
            event_data={"ai_confidence": ai_confidence, "severity": normalized.get("severity")},
            actor_type="AI"
        )
        
        db.commit()
        db.refresh(case)
        return case

    def log_event(
        self,
        db: Session,
        case_id: str,
        event_type: str,
        event_data: Optional[Dict[str, Any]] = None,
        actor_type: str = "SYSTEM",
        actor_id: Optional[str] = None
    ) -> CaseEvent:
        """Append an immutable audit event to the case history."""
        event = CaseEvent(
            case_id=case_id,
            event_type=event_type,
            event_data=sanitize_payload(event_data or {}),
            actor_type=actor_type,
            actor_id=actor_id,
            created_at=datetime.utcnow()
        )
        db.add(event)
        return event

    def update_status(
        self,
        db: Session,
        case: Case,
        new_status: str,
        actor_type: str = "SYSTEM",
        actor_id: Optional[str] = None,
        notes: Optional[str] = None
    ) -> Case:
        """Transition case status and record audit event."""
        old_status = case.status
        case.status = new_status
        case.updated_at = datetime.utcnow()
        
        if new_status == "SUBMITTED" and not case.submitted_at:
            case.submitted_at = datetime.utcnow()
        elif new_status == "RESOLVED":
            case.resolved_at = datetime.utcnow()
        elif new_status == "CLOSED":
            case.closed_at = datetime.utcnow()
            
        self.log_event(
            db=db,
            case_id=case.id,
            event_type="STATUS_CHANGED",
            event_data={"old_status": old_status, "new_status": new_status, "notes": notes},
            actor_type=actor_type,
            actor_id=actor_id
        )
        db.commit()
        db.refresh(case)
        return case

    def get_case_by_case_id(self, db: Session, case_id: str) -> Optional[Case]:
        return db.query(Case).filter(Case.case_id == case_id).first()

    def get_case_by_id(self, db: Session, id: str) -> Optional[Case]:
        return db.query(Case).filter(Case.id == id).first()

    def list_cases(
        self,
        db: Session,
        skip: int = 0,
        limit: int = 20,
        status: Optional[str] = None,
        category: Optional[str] = None,
        citizen_id: Optional[str] = None
    ) -> Tuple[List[Case], int]:
        query = db.query(Case)
        if status:
            query = query.filter(Case.status == status)
        if category:
            query = query.filter(Case.normalized["category"].astext == category)
        if citizen_id:
            query = query.filter(Case.citizen_id == citizen_id)
            
        total = query.count()
        cases = query.order_by(Case.created_at.desc()).offset(skip).limit(limit).all()
        return cases, total

case_service = CaseService()
