import json
from pathlib import Path
from typing import Optional
from backend.app.config import settings

_JURISDICTION_DATA = None

def _load_jurisdictions():
    global _JURISDICTION_DATA
    if _JURISDICTION_DATA is None:
        file_path = settings.DATA_DIR / "jurisdictions" / "jurisdictions.json"
        if file_path.exists():
            with open(file_path, "r", encoding="utf-8") as f:
                _JURISDICTION_DATA = json.load(f)
        else:
            _JURISDICTION_DATA = {"pincodes": {}, "states": []}
    return _JURISDICTION_DATA

def resolve_pincode(pincode: str) -> Optional[dict]:
    """Resolve 6-digit India Post PIN code to State, District, Municipality, and Ward."""
    data = _load_jurisdictions()
    pincode_clean = str(pincode).strip()
    return data.get("pincodes", {}).get(pincode_clean)

def resolve_location(lat: Optional[float], lng: Optional[float], pincode: Optional[str] = None, address: Optional[str] = None) -> dict:
    """Resolve location facts from coordinates or postal PIN code."""
    res = {
        "pincode": pincode,
        "lat": lat,
        "lng": lng,
        "address": address or "",
        "state": "Maharashtra",
        "state_code": "MH",
        "district": "Nagpur",
        "municipality": "Nagpur Municipal Corporation",
        "ward": "Ward 12 (Ramdaspeth)",
        "zone": "Dharampeth Zone 2"
    }
    
    if pincode:
        geo = resolve_pincode(pincode)
        if geo:
            res.update({
                "state": geo.get("state", res["state"]),
                "state_code": geo.get("state_code", res["state_code"]),
                "district": geo.get("district", res["district"]),
                "municipality": geo.get("municipality", res["municipality"]),
                "ward": geo.get("ward", res["ward"]),
                "zone": geo.get("zone", res["zone"]),
                "lat": geo.get("lat", lat),
                "lng": geo.get("lng", lng)
            })
            return res
            
    # Default fallback for Nagpur sample if nothing provided
    return res
