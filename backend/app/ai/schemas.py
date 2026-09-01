from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field

class FactItem(BaseModel):
    key: str
    value: str
    confidence: float = 1.0

class AIPipelineOutput(BaseModel):
    language: str = "hi"
    original_text: str
    translated_en: str
    summary: str
    category: str
    subcategory: Optional[str] = None
    domain: str
    department: str
    severity: str
    entities: List[Dict[str, Any]] = Field(default_factory=list)
    location_clues: List[str] = Field(default_factory=list)
    evidence_mentioned: List[str] = Field(default_factory=list)
    requested_action: Optional[str] = None
    clarification_needed: bool = False
    clarification_question: Optional[str] = None
    confidence_score: float = 0.85
    complaint_draft_en: str
    complaint_draft_local: str
