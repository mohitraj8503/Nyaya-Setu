import json
import re
from typing import Tuple, Dict, Any, Optional
from backend.app.config import settings

_TAXONOMY_CACHE = None

def _load_taxonomy():
    global _TAXONOMY_CACHE
    if _TAXONOMY_CACHE is None:
        path = settings.DATA_DIR / "taxonomy" / "categories.json"
        if path.exists():
            with open(path, "r", encoding="utf-8") as f:
                _TAXONOMY_CACHE = json.load(f)
        else:
            _TAXONOMY_CACHE = {"domains": []}
    return _TAXONOMY_CACHE

class ClassificationEngine:
    def __init__(self):
        self.taxonomy = _load_taxonomy()

    def classify(self, text: str, language: str = "hi") -> Dict[str, Any]:
        """Classify citizen text into domain, category, and department with confidence scoring."""
        text_lower = text.lower().strip()
        
        best_match = None
        highest_score = 0
        
        for domain in self.taxonomy.get("domains", []):
            domain_id = domain.get("id")
            for cat in domain.get("categories", []):
                score = 0
                keywords = cat.get("keywords", [])
                
                # Check direct keyword matches
                for kw in keywords:
                    kw_lower = kw.lower()
                    if kw_lower in text_lower:
                        score += 3
                        
                # Check category name match
                if cat.get("name", "").lower() in text_lower or cat.get("name_hi", "") in text_lower:
                    score += 5
                    
                # Exact word boundary hits
                words = re.findall(r"\w+", text_lower)
                for word in words:
                    if word in [k.lower() for k in keywords]:
                        score += 1
                        
                if score > highest_score:
                    highest_score = score
                    best_match = {
                        "domain": domain_id,
                        "category": cat.get("id"),
                        "category_name": cat.get("name"),
                        "category_name_hi": cat.get("name_hi"),
                        "department": cat.get("department"),
                        "default_sla_days": cat.get("default_sla_days", 7),
                        "severity_default": cat.get("severity_default", "medium"),
                    }
                    
        # If no strong match, default to civic roads or general inquiry
        if not best_match or highest_score == 0:
            best_match = {
                "domain": "civic_infrastructure",
                "category": "roads_potholes",
                "category_name": "Roads & Potholes",
                "category_name_hi": "सड़कें एवं गड्ढे",
                "department": "Public Works / Municipal Roads Department",
                "default_sla_days": 7,
                "severity_default": "medium",
            }
            confidence = 0.45
            clarification_needed = True
        else:
            confidence = min(0.98, 0.65 + (highest_score * 0.06))
            clarification_needed = confidence < 0.60
            
        return {
            **best_match,
            "confidence": round(confidence, 2),
            "clarification_needed": clarification_needed
        }

classifier = ClassificationEngine()
