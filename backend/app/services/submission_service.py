from datetime import datetime
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session
from backend.app.models.models import Case, Submission, Authority
from backend.app.channels.email_adapter import email_adapter
from backend.app.channels.portal_adapter import portal_adapter
from backend.app.channels.other_adapters import whatsapp_adapter, sms_adapter, manual_adapter
from backend.app.services.authority_service import authority_service
from backend.app.services.case_service import case_service
from backend.app.services.notification_service import notification_service

class SubmissionService:
    def __init__(self):
        self.adapters = [
            email_adapter,
            portal_adapter,
            whatsapp_adapter,
            sms_adapter,
            manual_adapter
        ]

    def _get_adapter(self, channel: str):
        for ad in self.adapters:
            if ad.can_handle(channel):
                return ad
        return portal_adapter

    async def execute_submission(
        self,
        db: Session,
        case: Case,
        channel_override: Optional[str] = None
    ) -> Dict[str, Any]:
        """Execute submission across designated channel adapter and update case state."""
        channel = channel_override or case.channel or "PORTAL"
        adapter = self._get_adapter(channel)
        
        authority = authority_service.get_by_authority_id(db, case.authority_id) if case.authority_id else None
        authority_data = {
            "department": authority.department if authority else (case.department or "Municipal Office"),
            "office_name": authority.office_name if authority else "Local Authority",
            "email": authority.email if authority else "nodal@nyayasetu.org",
            "phone": authority.phone if authority else "1915",
            "portal_url": authority.portal_url if authority else "https://pgportal.gov.in"
        }
        
        case_data = {
            "case_id": case.case_id,
            "category": case.normalized.get("category") if case.normalized else "Civic Grievance",
            "complaint_text": case.complaint_text or case.complaint_text_en or "",
            "raw_text": case.raw_input.get("text", ""),
            "location": case.location or {}
        }
        
        result = await adapter.submit(case_data, authority_data)
        
        # Create Submission Record
        sub = Submission(
            case_id=case.id,
            channel=result.channel,
            status=result.status,
            payload=case_data,
            response=result.response_data,
            reference_id=result.reference_id,
            submitted_at=datetime.utcnow()
        )
        db.add(sub)
        
        # Update case reference and status
        case.reference_id = result.reference_id
        case_service.update_status(
            db=db,
            case=case,
            new_status="SUBMITTED",
            actor_type="SYSTEM",
            notes=f"Submitted via {result.channel} (Ref: {result.reference_id})"
        )
        
        # Log SUBMITTED event
        case_service.log_event(
            db=db,
            case_id=case.id,
            event_type="SUBMITTED",
            event_data={
                "channel": result.channel,
                "reference_id": result.reference_id,
                "authority": authority_data.get("office_name")
            },
            actor_type="SYSTEM"
        )
        
        # Trigger citizen SMS / WhatsApp acknowledgement
        notification_service.notify_case_submission(db, case)
        
        db.commit()
        db.refresh(case)
        
        return {
            "success": result.success,
            "channel": result.channel,
            "status": result.status,
            "reference_id": result.reference_id,
            "message": result.message,
            "case_id": case.case_id
        }

submission_service = SubmissionService()
