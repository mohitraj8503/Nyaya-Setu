from datetime import datetime
from typing import Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from backend.app.database import get_db
from backend.app.models.models import Case
from backend.app.services.case_service import case_service

router = APIRouter(prefix="/v2/officer", tags=["v2-officer"])

@router.get("/queue")
def get_officer_queue(
    ward: Optional[str] = None,
    department: Optional[str] = None,
    priority: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Fetch prioritized intake queue for ward nodal officers."""
    query = db.query(Case).filter(Case.status.in_(["SUBMITTED", "ACKNOWLEDGED", "ASSIGNED", "IN_PROGRESS", "ROUTE_CONFIRMED"]))
    
    if ward:
        query = query.filter(Case.location["ward"].astext == ward)
    if department:
        query = query.filter(Case.department.ilike(f"%{department}%"))
        
    cases = query.order_by(Case.created_at.desc()).all()
    
    formatted = []
    for c in cases:
        formatted.append({
            "id": c.id,
            "case_id": c.case_id,
            "summary": c.normalized.get("summary") if c.normalized else "Citizen Grievance",
            "category": c.normalized.get("category") if c.normalized else "General",
            "severity": c.normalized.get("severity", "medium") if c.normalized else "medium",
            "ward": c.location.get("ward") if c.location else "Nagpur",
            "status": c.status,
            "sla_deadline": c.sla_deadline.isoformat() if c.sla_deadline else None,
            "sla_breached": c.sla_breached,
            "escalation_level": c.escalation_level,
            "created_at": c.created_at.isoformat() if c.created_at else None
        })
        
    return {
        "total_active": len(formatted),
        "critical_count": sum(1 for x in formatted if x["severity"] == "critical"),
        "breached_count": sum(1 for x in formatted if x["sla_breached"]),
        "queue": formatted
    }

@router.post("/cases/{case_id}/action")
def officer_action(
    case_id: str,
    action: str = Query(..., description="ACCEPT, RESOLVE, TRANSFER, REQUEST_INFO"),
    notes: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Execute triage action on complaint."""
    case = case_service.get_case_by_case_id(db, case_id) or case_service.get_case_by_id(db, case_id)
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
        
    action_upper = action.upper()
    if action_upper == "ACCEPT":
        case_service.update_status(db, case, "IN_PROGRESS", actor_type="OFFICER", notes=notes or "Accepted for field resolution")
    elif action_upper == "RESOLVE":
        case_service.update_status(db, case, "RESOLVED", actor_type="OFFICER", notes=notes or "Field resolution completed by officer")
    elif action_upper == "TRANSFER":
        case_service.update_status(db, case, "ASSIGNED", actor_type="OFFICER", notes=notes or "Transferred to competent field department")
    elif action_upper == "REQUEST_INFO":
        case_service.log_event(db, case.id, "STATUS_CHANGED", event_data={"action": "REQUEST_INFO", "notes": notes}, actor_type="OFFICER")
    else:
        raise HTTPException(status_code=400, detail=f"Unsupported action: {action}")
        
    return {"ok": True, "case_id": case.case_id, "status": case.status, "action_performed": action_upper}
