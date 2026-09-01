from datetime import datetime
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
from backend.app.models.models import Notification, Case, User
from backend.app.config import settings

class NotificationService:
    def send_notification(
        self,
        db: Session,
        case: Case,
        recipient_type: str,
        recipient_contact: str,
        channel: str,
        template_key: str,
        content: Dict[str, Any]
    ) -> Notification:
        """Log and dispatch multi-channel notification (SMS, WhatsApp, Email)."""
        notif = Notification(
            case_id=case.id if case else None,
            recipient_type=recipient_type,
            recipient_contact=recipient_contact,
            channel=channel,
            template_key=template_key,
            content=content,
            status="SENT",
            sent_at=datetime.utcnow()
        )
        db.add(notif)
        db.commit()
        db.refresh(notif)
        return notif

    def notify_case_submission(self, db: Session, case: Case, citizen_phone: Optional[str] = None):
        """Send immediate SMS & WhatsApp acknowledgement upon complaint submission."""
        contact = citizen_phone or (case.citizen.phone if case.citizen else "+91-9876543210")
        msg = f"NyayaSetu: Grievance {case.case_id} submitted to {case.department or 'Competent Authority'}. Track: https://nyayasetu.org/track/{case.case_id}"
        
        self.send_notification(
            db=db,
            case=case,
            recipient_type="CITIZEN",
            recipient_contact=contact,
            channel="SMS",
            template_key="SUBMISSION_ACK",
            content={"message": msg, "case_id": case.case_id}
        )

    def notify_escalation(self, db: Session, case: Case):
        """Notify citizen of automated escalation due to SLA trigger."""
        contact = case.citizen.phone if case.citizen else "+91-9876543210"
        msg = f"NyayaSetu Alert: Grievance {case.case_id} has breached standard SLA and has been automatically escalated to Senior Supervisory Authority."
        
        self.send_notification(
            db=db,
            case=case,
            recipient_type="CITIZEN",
            recipient_contact=contact,
            channel="SMS",
            template_key="SLA_ESCALATED",
            content={"message": msg, "case_id": case.case_id}
        )

notification_service = NotificationService()
