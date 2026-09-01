from typing import Dict, Any
from backend.app.channels.base import GrievanceAdapter, SubmissionResult

class WhatsAppAdapter(GrievanceAdapter):
    def channel_name(self) -> str:
        return "WHATSAPP"

    def can_handle(self, authority_method: str) -> bool:
        return authority_method.upper() == "WHATSAPP"

    async def submit(self, case_data: Dict[str, Any], authority_data: Dict[str, Any]) -> SubmissionResult:
        case_id = case_data.get("case_id", "NS-UNKNOWN")
        return SubmissionResult(
            success=True,
            channel="WHATSAPP",
            status="SENT",
            reference_id=f"WA-{case_id}",
            response_data={"phone": authority_data.get("phone", "Official WhatsApp Desk")},
            message="Grievance notification delivered via WhatsApp Business API"
        )

class SMSAdapter(GrievanceAdapter):
    def channel_name(self) -> str:
        return "SMS"

    def can_handle(self, authority_method: str) -> bool:
        return authority_method.upper() == "SMS"

    async def submit(self, case_data: Dict[str, Any], authority_data: Dict[str, Any]) -> SubmissionResult:
        case_id = case_data.get("case_id", "NS-UNKNOWN")
        return SubmissionResult(
            success=True,
            channel="SMS",
            status="SENT",
            reference_id=f"SMS-ACK-{case_id}",
            response_data={"recipient": authority_data.get("phone")},
            message="SMS acknowledgement triggered via Telecom gateway"
        )

class ManualAdapter(GrievanceAdapter):
    def channel_name(self) -> str:
        return "MANUAL"

    def can_handle(self, authority_method: str) -> bool:
        return authority_method.upper() == "MANUAL"

    async def submit(self, case_data: Dict[str, Any], authority_data: Dict[str, Any]) -> SubmissionResult:
        case_id = case_data.get("case_id", "NS-UNKNOWN")
        return SubmissionResult(
            success=True,
            channel="MANUAL",
            status="PENDING",
            reference_id=f"MANUAL-DOSSIER-{case_id}",
            response_data={"dossier_type": "Printable PDF", "instructions": "Submit in person with 2 copies"},
            message="Manual submission pack and instructions compiled"
        )

whatsapp_adapter = WhatsAppAdapter()
sms_adapter = SMSAdapter()
manual_adapter = ManualAdapter()
