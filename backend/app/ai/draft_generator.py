from datetime import datetime
from typing import Dict, Any

class ComplaintDraftGenerator:
    def generate(
        self,
        summary: str,
        category_name: str,
        department: str,
        location: Dict[str, Any],
        facts: Dict[str, Any],
        language: str = "hi",
        citizen_name: str = "Aggrieved Citizen",
        case_id: str = "NS-2026-XXXXXX"
    ) -> Dict[str, str]:
        """Generate structured, official formal complaint text in English and local Indic language."""
        date_str = datetime.utcnow().strftime("%d-%m-%Y")
        loc_str = f"{location.get('ward', '')}, {location.get('district', '')}, {location.get('state', '')} (PIN: {location.get('pincode', 'N/A')})"
        
        # English Draft
        draft_en = f"""TO:
The Competent Nodal Grievance Officer,
{department}
{location.get('municipality', 'Municipal Authority / Administrative Body')}, {location.get('district', 'Nagpur')}

DATE: {date_str}
REFERENCE / CASE TRACKING ID: {case_id}
SUBJECT: Formal Citizen Grievance regarding {category_name} at {location.get('ward', 'Local Jurisdiction')}

Respected Sir/Madam,

I am writing to bring to your urgent administrative attention a serious public matter regarding {summary}.

1. INCIDENT & JURISDICTION DETAILS:
- Location / Landmark: {loc_str}
- Category of Grievance: {category_name}
- Specific Observation: The issue has caused severe public inconvenience, safety risk, or administrative deficiency in the locality.

2. SUBSTANTIATING FACTS & EVIDENCE:
- Evidence / Indicators Mentioned: {', '.join(facts.get('evidence_mentioned', [])) or 'Site conditions / public observation'}
- Extracted Details: {', '.join([f"{e.get('label')}: {e.get('value')}" for e in facts.get('entities', [])]) or 'Direct observation by resident'}

3. REQUESTED ADMINISTRATIVE RELIEF:
In accordance with citizen service charters and relevant statutory service-level benchmarks, I respectfully request:
a) Immediate site inspection and verification by the concerned field officer.
b) Time-bound rectification of the grievance within the stipulated SLA timeframe.
c) Issuance of an official acknowledgement and reference number for digital tracking.

Thanking you.

Yours faithfully,
{citizen_name}
Recorded via NyayaSetu Citizen Platform (Ref: {case_id})
"""

        # Hindi Draft
        draft_hi = f"""सेवा में,
सक्षम नोडल शिकायत निवारण अधिकारी,
{department}
{location.get('municipality', 'नगर निगम / प्रशासनिक विभाग')}, {location.get('district', 'नागपुर')}

दिनांक: {date_str}
संदर्भ / केस ट्रैकिंग संख्या: {case_id}
विषय: {loc_str} में {category_name} के संबंध में औपचारिक नागरिक शिकायत

महोदय / महोदया,

सविनय निवेदन है कि मैं आपके संज्ञान में निम्नलिखित सार्वजनिक समस्या लाना चाहता हूँ:

१. समस्या का विवरण:
- स्थान / लैंडमार्क: {loc_str}
- समस्या का प्रकार: {category_name}
- मुख्य बिंदु: {summary}

२. साक्ष्य एवं विवरण:
- साक्ष्य: {', '.join(facts.get('evidence_mentioned', [])) or 'प्रत्यक्ष स्थलीय निरीक्षण साक्ष्य'}
- संबंधित विवरण: {', '.join([f"{e.get('label')}: {e.get('value')}" for e in facts.get('entities', [])]) or 'नागरिक द्वारा दर्ज'}

३. अपेक्षित प्रशासनिक कार्यवाही:
नागरिक सेवा अधिकार अधिनियम एवं निर्धारित सेवा मानकों के तहत आपसे सादर अनुरोध है कि:
क) संबंधित क्षेत्र अधिकारी द्वारा तत्काल स्थलीय निरीक्षण कराया जाए।
ख) निर्धारित समय-सीमा (SLA) के भीतर समस्या का समुचित समाधान किया जाए।
ग) शिकायत की प्राप्ति सूचना (Acknowledgement) एवं ट्रैकिंग संदर्भ संख्या उपलब्ध कराई जाए।

भवदीय,
{citizen_name}
(न्यायसेतु नागरिक शिकायत पोर्टल के माध्यम से प्रेषित - {case_id})
"""

        return {
            "en": draft_en.strip(),
            "hi": draft_hi.strip(),
            "local": draft_hi.strip() if language == "hi" else draft_en.strip()
        }

draft_generator = ComplaintDraftGenerator()
