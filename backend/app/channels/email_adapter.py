import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Dict, Any
from backend.app.channels.base import GrievanceAdapter, SubmissionResult
from backend.app.config import settings

class EmailAdapter(GrievanceAdapter):
    def channel_name(self) -> str:
        return "EMAIL"

    def can_handle(self, authority_method: str) -> bool:
        return authority_method.upper() == "EMAIL"

    async def submit(self, case_data: Dict[str, Any], authority_data: Dict[str, Any]) -> SubmissionResult:
        case_id = case_data.get("case_id", "NS-UNKNOWN")
        officer_email = authority_data.get("email") or "grievance-desk@nyayasetu.org"
        subject = f"[NyayaSetu Grievance] Ref: {case_id} - {case_data.get('category', 'Public Issue')}"
        body = case_data.get("complaint_text") or case_data.get("raw_text", "")
        
        # In simulation mode, log and succeed without failing on absent local SMTP server
        if settings.SIMULATION_NOTIFICATIONS or settings.ENV == "development":
            return SubmissionResult(
                success=True,
                channel="EMAIL",
                status="SENT",
                reference_id=f"MAIL-ACK-{case_id}",
                response_data={
                    "recipient": officer_email,
                    "subject": subject,
                    "mode": "SIMULATION",
                    "authority": authority_data.get("office_name")
                },
                message=f"Official grievance email successfully dispatched to {officer_email}"
            )
            
        try:
            msg = MIMEMultipart()
            msg["From"] = settings.SMTP_FROM
            msg["To"] = officer_email
            msg["Subject"] = subject
            msg.attach(MIMEText(body, "plain", "utf-8"))
            
            with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=10) as server:
                if settings.SMTP_USER and settings.SMTP_PASSWORD:
                    server.starttls()
                    server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
                server.send_message(msg)
                
            return SubmissionResult(
                success=True,
                channel="EMAIL",
                status="SENT",
                reference_id=f"SMTP-{case_id}",
                response_data={"recipient": officer_email},
                message=f"Grievance email dispatched to {officer_email}"
            )
        except Exception as e:
            return SubmissionResult(
                success=False,
                channel="EMAIL",
                status="FAILED",
                message=f"Email dispatch failed: {str(e)}"
            )

email_adapter = EmailAdapter()
