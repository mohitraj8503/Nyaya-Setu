from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from backend.app.database import get_db
from backend.app.services.authority_service import authority_service
from backend.app.models.models import Authority

router = APIRouter(prefix="/v2/authorities", tags=["v2-authorities"])

@router.get("")
def list_authorities(
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db)
):
    authorities = authority_service.list_authorities(db, limit=limit)
    return [
        {
            "id": a.id,
            "authority_id": a.authority_id,
            "department": a.department,
            "jurisdiction": a.jurisdiction,
            "designation": a.designation,
            "office_name": a.office_name,
            "email": a.email,
            "phone": a.phone,
            "portal_url": a.portal_url,
            "submission_method": a.submission_method,
            "verification_status": a.verification_status,
            "parent_authority_id": a.parent_authority_id
        }
        for a in authorities
    ]

@router.get("/{authority_id}")
def get_authority(authority_id: str, db: Session = Depends(get_db)):
    auth = authority_service.get_by_authority_id(db, authority_id)
    if not auth:
        raise HTTPException(status_code=404, detail="Authority not found")
        
    parent = authority_service.get_parent_authority(db, auth)
    return {
        "id": auth.id,
        "authority_id": auth.authority_id,
        "department": auth.department,
        "jurisdiction": auth.jurisdiction,
        "designation": auth.designation,
        "office_name": auth.office_name,
        "email": auth.email,
        "phone": auth.phone,
        "portal_url": auth.portal_url,
        "submission_method": auth.submission_method,
        "verification_status": auth.verification_status,
        "parent_authority": {
            "authority_id": parent.authority_id,
            "office_name": parent.office_name,
            "department": parent.department
        } if parent else None
    }

@router.put("/{authority_id}/verify")
def verify_authority(
    authority_id: str,
    status: str = Query("VERIFIED"),
    db: Session = Depends(get_db)
):
    auth = authority_service.verify_authority(db, authority_id, status=status)
    if not auth:
        raise HTTPException(status_code=404, detail="Authority not found")
    return {"ok": True, "authority_id": auth.authority_id, "verification_status": auth.verification_status}
