import json
from typing import Dict, Any
from backend.app.config import settings

_SEVERITY_RULES = None

def _load_severity_rules():
    global _SEVERITY_RULES
    if _SEVERITY_RULES is None:
        path = settings.DATA_DIR / "taxonomy" / "severity-rules.json"
        if path.exists():
            with open(path, "r", encoding="utf-8") as f:
                _SEVERITY_RULES = json.load(f)
        else:
            _SEVERITY_RULES = {"rules": []}
    return _SEVERITY_RULES

class SeverityAnalyzer:
    def __init__(self):
        self.rules = _load_severity_rules()

    def analyze(self, text: str, category: str, default_severity: str = "medium") -> Dict[str, Any]:
        """Analyze text and category against deterministic safety rules."""
        text_lower = text.lower()
        
        for rule in self.rules.get("rules", []):
            conditions = rule.get("conditions", {})
            
            # Check category match
            if category in conditions.get("categories", []):
                return {
                    "severity": rule.get("severity"),
                    "max_sla_hours": rule.get("max_sla_hours"),
                    "escalation_trigger_hours": rule.get("escalation_trigger_hours"),
                    "requires_instant_sms": rule.get("requires_instant_sms", False),
                    "reason": f"Category rule match ({category})"
                }
                
            # Check keyword match
            for kw in conditions.get("keywords", []):
                if kw in text_lower:
                    return {
                        "severity": rule.get("severity"),
                        "max_sla_hours": rule.get("max_sla_hours"),
                        "escalation_trigger_hours": rule.get("escalation_trigger_hours"),
                        "requires_instant_sms": rule.get("requires_instant_sms", False),
                        "reason": f"Safety keyword detected ('{kw}')"
                    }
                    
        return {
            "severity": default_severity,
            "max_sla_hours": 168,
            "escalation_trigger_hours": 72,
            "requires_instant_sms": False,
            "reason": "Default baseline severity"
        }

severity_analyzer = SeverityAnalyzer()
