from datetime import datetime
from typing import Optional, Any, List
from pydantic import BaseModel, Field

class LocationData(BaseModel):
    pincode: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    address: Optional[str] = None
    state: Optional[str] = None
    state_code: Optional[str] = None
    district: Optional[str] = None
    municipality: Optional[str] = None
    ward: Optional[str] = None
    zone: Optional[str] = None

class AIClassificationResult(BaseModel):
    language: str = "hi"
    summary: str
    category: str
    subcategory: Optional[str] = None
    severity: str = "medium"
    entities: List[dict] = Field(default_factory=list)
    location_clues: List[str] = Field(default_factory=list)
    evidence_mentioned: List[str] = Field(default_factory=list)
    requested_action: Optional[str] = None
    clarification_needed: bool = False
    clarification_question: Optional[str] = None
    confidence: float = 0.85

class CaseEventOut(BaseModel):
    id: str
    event_type: str
    event_data: dict = Field(default_factory=dict)
    actor_id: Optional[str] = None
    actor_type: str
    created_at: datetime

    class Config:
        from_attributes = True

class CaseDetailOut(BaseModel):
    id: str
    case_id: str
    citizen_id: Optional[str] = None
    status: str
    raw_input: dict = Field(default_factory=dict)
    normalized: dict = Field(default_factory=dict)
    ai_confidence: dict = Field(default_factory=dict)
    location: dict = Field(default_factory=dict)
    department: Optional[str] = None
    authority_id: Optional[str] = None
    channel: str = "PORTAL"
    complaint_text: Optional[str] = None
    complaint_text_en: Optional[str] = None
    reference_id: Optional[str] = None
    sla_deadline: Optional[datetime] = None
    sla_breached: bool = False
    escalation_level: int = 0
    created_at: datetime
    updated_at: datetime
    submitted_at: Optional[datetime] = None
    resolved_at: Optional[datetime] = None
    events: List[CaseEventOut] = Field(default_factory=list)

    class Config:
        from_attributes = True

class CaseListOut(BaseModel):
    cases: List[CaseDetailOut]
    total: int
    page: int
    limit: int
