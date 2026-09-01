from typing import Dict, Any, Optional
from backend.app.utils.geo import resolve_location, resolve_pincode

class JurisdictionService:
    def resolve(
        self,
        lat: Optional[float] = None,
        lng: Optional[float] = None,
        pincode: Optional[str] = None,
        address: Optional[str] = None
    ) -> Dict[str, Any]:
        """Resolve geographical point to administrative jurisdiction hierarchy."""
        return resolve_location(lat=lat, lng=lng, pincode=pincode, address=address)

jurisdiction_service = JurisdictionService()
