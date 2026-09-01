from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List
from sqlalchemy.orm import Session
from backend.app.models.models import Case, Escalation, Authority
from backend.app.services.authority_service import authority_service
from backend.app.services.case_service import case_service
from backend.app.services.sla_service import sla_service

class EscalationService:
    def check_and_escalate_all_breaches(self, db: Session) -> List[Dict[str, Any]]:
        """Run periodic check across all active cases and escalate breached ones."""
        breached_cases = sla_service.check_breaches(db)
        results = []
        for case in breached_cases:
            res = self.escalate_case(db, case, reason="Automated SLA breach detection")
            results.append(res)
        return results

    def escalate_case(self, db: Session, case: Case, reason: str = "SLA deadline exceeded") -> Dict[str, Any]:
        """Escalate a specific case to next higher tier authority in the administrative hierarchy."""
        current_authority_id = case.authority_id
        current_authority = authority_service.get_by_authority_id(db, current_authority_id) if current_authority_id else None
        
        parent_authority = None
        if current_authority:
            parent_authority = authority_service.get_parent_authority(db, current_authority)
            
        next_level = (case.escalation_level or 0) + 1
        new_authority_id = parent_authority.authority_id if parent_authority else current_authority_id
        
        # Mark breach and update case
        case.sla_breached = True
        case.escalation_level = next_level
        if parent_authority:
            case.authority_id = parent_authority.authority_id
            case.department = parent_authority.department
            
        # Extend SLA by 3 days for escalated tier
        case.sla_deadline = datetime.utcnow() + timedelta(days=3)
        case.updated_at = datetime.utcnow()
        
        # Record escalation entry
        escalation_record = Escalation(
            case_id=case.id,
            level=next_level,
            from_authority_id=current_authority_id or "UNKNOWN",
            to_authority_id=new_authority_id or "COMMISSIONER-HQ",
            reason=reason,
            escalated_at=datetime.utcnow()
        )
        db.add(escalation_record)
        
        # Log case event
        case_service.log_event(
            db=db,
            case_id=case.id,
            event_type="ESCALATED",
            event_data={
                "level": next_level,
                "from_authority": current_authority.office_name if current_authority else current_authority_id,
                "to_authority": parent_authority.office_name if parent_authority else "Appellate Nodal Head",
                "reason": reason
            },
            actor_type="SYSTEM"
        )
        
        db.commit()
        db.refresh(case)
        
        return {
            "case_id": case.case_id,
            "escalated": True,
            "level": next_level,
            "new_authority": parent_authority.office_name if parent_authority else "Senior Appellate Officer"
        }

escalation_service = EscalationService()
