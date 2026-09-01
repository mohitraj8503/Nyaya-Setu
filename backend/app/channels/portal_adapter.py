from typing import Dict, Any
from backend.app.channels.base import GrievanceAdapter, SubmissionResult

class PortalAdapter(GrievanceAdapter):
    def channel_name(self) -> str:
        return "PORTAL"

    def can_handle(self, authority_method: str) -> bool:
        return authority_method.upper() in ["PORTAL", "API"]

    async def submit(self, case_data: Dict[str, Any], authority_data: Dict[str, Any]) -> SubmissionResult:
        case_id = case_data.get("case_id", "NS-UNKNOWN")
        portal_url = authority_data.get("portal_url", "https://pgportal.gov.in")
        
        # Build portal submission payload
        payload = {
            "portal_name": authority_data.get("department"),
            "portal_url": portal_url,
            "category": case_data.get("category"),
            "location": case_data.get("location"),
            "description": case_data.get("complaint_text") or case_data.get("raw_text"),
            "generated_tracking_code": case_id,
            "checklist": [
                "1. Keep reference ID saved for status checks",
                "2. Upload site photos if requested by nodal officer",
                "3. Follow up if status does not change within SLA window"
            ]
        }
        
        return SubmissionResult(
            success=True,
            channel="PORTAL",
            status="ACKNOWLEDGED",
            reference_id=f"GOV-PORTAL-{case_id}",
            response_data=payload,
            message=f"Case compiled and ready for portal synchronization with {portal_url}"
        )

portal_adapter = PortalAdapter()
