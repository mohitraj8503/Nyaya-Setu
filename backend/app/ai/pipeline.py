from typing import Dict, Any, Optional
from backend.app.ai.classification import classifier
from backend.app.ai.extraction import entity_extractor
from backend.app.ai.severity import severity_analyzer
from backend.app.ai.clarification import clarification_engine
from backend.app.ai.draft_generator import draft_generator
from backend.app.ai.translation import translation_service
from backend.app.ai.transcription import transcription_service

class AIPipeline:
    async def process_intake(
        self,
        text: Optional[str] = None,
        audio_bytes: Optional[bytes] = None,
        language: str = "hi",
        location: Optional[Dict[str, Any]] = None,
        citizen_name: Optional[str] = "Citizen",
        case_id: str = "NS-2026-000000"
    ) -> Dict[str, Any]:
        """Orchestrates speech-to-text, translation, classification, extraction, severity, clarification, and drafting."""
        
        # 1. Voice transcription if audio input
        detected_lang = language
        if audio_bytes and not text:
            text, detected_lang = await transcription_service.transcribe(audio_bytes, language_hint=language)
            
        raw_text = (text or "").strip()
        if not raw_text:
            raw_text = "सार्वजनिक समस्या दर्ज की जा रही है।"
            
        # 2. Extract facts & entities
        facts = entity_extractor.extract(raw_text)
        
        # 3. Classify Category & Domain
        classification = classifier.classify(raw_text, language=detected_lang)
        
        # 4. Analyze Severity & SLA window
        severity_info = severity_analyzer.analyze(
            raw_text,
            category=classification["category"],
            default_severity=classification.get("severity_default", "medium")
        )
        
        # 5. Evaluate Clarification Need
        needs_clarify, clarify_q = clarification_engine.evaluate(
            raw_text,
            category=classification["category"],
            confidence=classification["confidence"],
            language=detected_lang
        )
        
        # 6. Generate Formal Bilingual Drafts
        drafts = draft_generator.generate(
            summary=raw_text[:140],
            category_name=classification.get("category_name", "Public Grievance"),
            department=classification.get("department", "Public Grievance Dept"),
            location=location or {},
            facts=facts,
            language=detected_lang,
            citizen_name=citizen_name or "Citizen",
            case_id=case_id
        )
        
        return {
            "language": detected_lang,
            "raw_text": raw_text,
            "summary": raw_text[:150] + ("..." if len(raw_text) > 150 else ""),
            "domain": classification.get("domain"),
            "category": classification.get("category"),
            "category_name": classification.get("category_name"),
            "category_name_hi": classification.get("category_name_hi"),
            "department": classification.get("department"),
            "default_sla_days": classification.get("default_sla_days", 7),
            "severity": severity_info["severity"],
            "severity_details": severity_info,
            "confidence": classification["confidence"],
            "entities": facts.get("entities", []),
            "location_clues": facts.get("location_clues", []),
            "evidence_mentioned": facts.get("evidence_mentioned", []),
            "pincode_found": facts.get("pincode_found"),
            "clarification_needed": needs_clarify,
            "clarification_question": clarify_q,
            "drafts": drafts
        }

ai_pipeline = AIPipeline()
