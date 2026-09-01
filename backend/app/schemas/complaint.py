from typing import Optional, List
from pydantic import BaseModel, Field
from backend.app.schemas.case import LocationData, AIClassificationResult

class ComplaintIntakeRequest(BaseModel):
    text: Optional[str] = None
    language: Optional[str] = "hi"
    input_type: str = "text"  # text, voice, image
    audio_base64: Optional[str] = None
    image_urls: List[str] = Field(default_factory=list)
    location: Optional[LocationData] = None
    phone: Optional[str] = None
    name: Optional[str] = None

class ClarificationAnswerRequest(BaseModel):
    case_id: str
    answer: str

class ComplaintIntakeResponse(BaseModel):
    case_id: str
    status: str
    analysis: AIClassificationResult
    routing: dict
    complaint_draft: dict
    location: dict
    requires_clarification: bool = False
    clarification_question: Optional[str] = None

class SubmitComplaintRequest(BaseModel):
    channel: Optional[str] = None
    custom_notes: Optional[str] = None
    confirmed_by_citizen: bool = True
