import re
from typing import Dict, Any, List

class EntityExtractor:
    def extract(self, text: str) -> Dict[str, Any]:
        """Extract structured entities (names, places, amounts, dates, contacts, PIN codes) from complaint text."""
        entities = []
        location_clues = []
        evidence_mentioned = []
        
        # 1. PIN code extraction (6-digit Indian PIN)
        pincodes = re.findall(r"\b[1-9][0-9]{5}\b", text)
        for pin in pincodes:
            entities.append({"type": "PINCODE", "value": pin, "label": "Postal Code"})
            location_clues.append(f"PIN {pin}")
            
        # 2. Monetary amounts (₹ or Rs or INR)
        amounts = re.findall(r"(?:₹|rs\.?|inr)\s*([0-9,]+(?:\.[0-9]{2})?)", text, flags=re.IGNORECASE)
        for amt in amounts:
            entities.append({"type": "AMOUNT", "value": f"₹{amt}", "label": "Financial Value"})
            
        # 3. Ward / Zone mentions
        wards = re.findall(r"(?:ward|वॉर्ड|वार्ड|zone|ज़ोन)\s*(?:no\.?|number|क्रमांक)?\s*([0-9]+|[a-zA-Z0-9_-]+)", text, flags=re.IGNORECASE)
        for w in wards:
            location_clues.append(f"Ward {w}")
            entities.append({"type": "WARD", "value": f"Ward {w}", "label": "Municipal Ward"})
            
        # 4. Evidence keywords
        evidence_keywords = {
            "bill": "Electricity / Utility Bill",
            "receipt": "Payment Receipt",
            "photo": "Site Photograph",
            "video": "Video Recording",
            "invoice": "Tax Invoice",
            "चिट्ठी": "Written Notice",
            "तस्वीर": "Photograph",
            "बिल": "Bill / Receipt"
        }
        for kw, label in evidence_keywords.items():
            if kw in text.lower():
                evidence_mentioned.append(label)
                
        # 5. Common location words
        loc_patterns = re.findall(r"(?:near|opposite|behind|at|road|street|nagar|colony|मार्ग|नगर|कालोनी)\s+([a-zA-Z0-9\u0900-\u097F]+)", text, flags=re.IGNORECASE)
        for loc in loc_patterns[:3]:
            location_clues.append(loc.strip())
            
        return {
            "entities": entities,
            "location_clues": list(set(location_clues)),
            "evidence_mentioned": list(set(evidence_mentioned)),
            "pincode_found": pincodes[0] if pincodes else None
        }

entity_extractor = EntityExtractor()
