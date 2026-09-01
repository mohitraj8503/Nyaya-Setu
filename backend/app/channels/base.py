from abc import ABC, abstractmethod
from typing import Dict, Any, Optional
from pydantic import BaseModel

class SubmissionResult(BaseModel):
    success: bool
    channel: str
    status: str  # PENDING, SENT, ACKNOWLEDGED, FAILED
    reference_id: Optional[str] = None
    response_data: Dict[str, Any] = {}
    message: str = ""

class GrievanceAdapter(ABC):
    @abstractmethod
    def channel_name(self) -> str:
        """Name of the submission channel (e.g. PORTAL, EMAIL, API, WHATSAPP, SMS, MANUAL)."""
        pass

    @abstractmethod
    def can_handle(self, authority_method: str) -> bool:
        """Check if this adapter handles the authority's designated submission method."""
        pass

    @abstractmethod
    async def submit(self, case_data: Dict[str, Any], authority_data: Dict[str, Any]) -> SubmissionResult:
        """Execute submission of grievance through this channel."""
        pass
