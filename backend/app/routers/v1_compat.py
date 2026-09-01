import json
from pathlib import Path
from datetime import datetime
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from backend.app.database import get_db
from backend.app.config import settings
from backend.app.utils.sanitize import sanitize_text, sanitize_payload
from backend.app.utils.tracking import generate_tracking_code
from backend.app.models.models import Contact, Newsletter, Feedback

router = APIRouter(tags=["v1-compatibility"])

def _read_legacy_json(filename: str):
    path = settings.DATA_DIR / filename
    if path.exists():
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    return []

@router.get("/health")
def health_check():
    return {
        "ok": True,
        "service": "nyayasetu-api",
        "apiVersion": "v2.0-compat-v1",
        "database": "sqlite-sqlalchemy",
        "environment": settings.ENV,
        "time": datetime.utcnow().isoformat()
    }

@router.get("/problems")
def search_problems(q: Optional[str] = Query(None)):
    problems = _read_legacy_json("problems.json")
    if not q:
        return problems
    q_clean = sanitize_text(q).lower()
    filtered = [
        p for p in problems
        if q_clean in p.get("title", "").lower()
        or q_clean in p.get("summary", "").lower()
        or q_clean in p.get("category", "").lower()
        or q_clean in p.get("keywords", "").lower()
    ]
    return filtered

@router.get("/routes/{route_id}")
def get_route(route_id: str):
    routes = _read_legacy_json("routes.json")
    questions = _read_legacy_json("questions.json")
    problems = _read_legacy_json("problems.json")
    
    route = next((r for r in routes if r["id"] == route_id), None)
    if not route:
        raise HTTPException(status_code=404, detail="Route not found")
        
    route_questions = [q for q in questions if q.get("route_id") == route_id or q.get("routeId") == route_id]
    route_questions.sort(key=lambda x: x.get("sort_order", 0))
    
    related_problems = [p for p in problems if p.get("route_id") == route_id or p.get("routeId") == route_id]
    
    return {
        **route,
        "questions": route_questions,
        "relatedProblems": related_problems
    }

@router.post("/drafts/generate")
def generate_legacy_draft(payload: Dict[str, Any]):
    route_id = payload.get("routeId")
    answers = payload.get("answers", {})
    routes = _read_legacy_json("routes.json")
    
    route = next((r for r in routes if r["id"] == route_id), None)
    if not route:
        raise HTTPException(status_code=404, detail="Route not found")
        
    template = route.get("draft_template") or route.get("draftTemplate") or ""
    
    # Interpolate {{key}}
    draft_text = template
    for k, v in answers.items():
        val = str(v).strip() if v else "[to be filled]"
        draft_text = draft_text.replace(f"{{{{{k}}}}}", val)
        
    return {
        "routeId": route_id,
        "draft": draft_text,
        "authorityName": route.get("authority_name") or route.get("authorityName"),
        "portalUrl": route.get("portal_url") or route.get("portalUrl")
    }

# In-memory tracker store for v1 simulation
_LEGACY_TRACKER = [
    {
        "id": 1,
        "title": "Road pothole in Ward 12",
        "category": "Roads & Infrastructure",
        "referenceId": "NMC-2026-4491",
        "trackingCode": "NS-20260901-7A9B2",
        "filingDate": "2026-09-01",
        "status": "in-progress",
        "notes": "Field inspection scheduled by Ward JE",
        "portalUrl": "https://www.nmcnagpur.gov.in",
        "createdAt": "2026-09-01T10:00:00Z"
    }
]

@router.get("/tracker")
def list_tracker_items():
    return {
        "items": _LEGACY_TRACKER,
        "total": len(_LEGACY_TRACKER),
        "page": 1,
        "limit": 20
    }

@router.post("/tracker")
def create_tracker_item(payload: Dict[str, Any]):
    sanitized = sanitize_payload(payload)
    item_id = len(_LEGACY_TRACKER) + 1
    code = sanitized.get("trackingCode") or generate_tracking_code()
    item = {
        "id": item_id,
        "title": sanitized.get("title", "Public Issue"),
        "category": sanitized.get("category", "General"),
        "referenceId": sanitized.get("referenceId", ""),
        "trackingCode": code,
        "filingDate": sanitized.get("filingDate", datetime.utcnow().strftime("%Y-%m-%d")),
        "status": sanitized.get("status", "drafted"),
        "notes": sanitized.get("notes", ""),
        "portalUrl": sanitized.get("portalUrl", ""),
        "createdAt": datetime.utcnow().isoformat()
    }
    _LEGACY_TRACKER.append(item)
    return {"ok": True, "item": item}

@router.post("/contact")
def create_contact(payload: Dict[str, Any], db: Session = Depends(get_db)):
    sanitized = sanitize_payload(payload)
    contact = Contact(
        name=sanitized.get("name", "Citizen"),
        email=sanitized.get("email", "citizen@example.com"),
        field=sanitized.get("field", "General Inquiry"),
        message=sanitized.get("message", ""),
        created_at=datetime.utcnow()
    )
    db.add(contact)
    db.commit()
    return {"ok": True, "message": "Contact submission recorded"}

@router.post("/newsletter")
def create_newsletter(payload: Dict[str, Any], db: Session = Depends(get_db)):
    email = sanitize_text(payload.get("email", "")).lower()
    if not email:
        raise HTTPException(status_code=400, detail="Email is required")
    existing = db.query(Newsletter).filter(Newsletter.email == email).first()
    if not existing:
        nl = Newsletter(email=email, created_at=datetime.utcnow())
        db.add(nl)
        db.commit()
    return {"ok": True, "message": "Subscribed successfully"}

@router.post("/feedback")
def create_feedback(payload: Dict[str, Any], db: Session = Depends(get_db)):
    sanitized = sanitize_payload(payload)
    fb = Feedback(
        rating=int(sanitized.get("rating", 5)),
        category=sanitized.get("category", "General Guidance"),
        feedback_text=sanitized.get("feedback_text") or sanitized.get("feedbackText", ""),
        helpful=bool(sanitized.get("helpful", True)),
        created_at=datetime.utcnow()
    )
    db.add(fb)
    db.commit()
    return {"ok": True, "message": "Feedback recorded with thanks"}
