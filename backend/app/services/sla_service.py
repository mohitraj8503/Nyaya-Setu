import json
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List
from sqlalchemy.orm import Session
from backend.app.models.models import Case
from backend.app.config import settings

_SLA_CONFIG = None

def _load_sla_config():
    global _SLA_CONFIG
    if _SLA_CONFIG is None:
        path = settings.DATA_DIR / "sla" / "sla-config.json"
        if path.exists():
            with open(path, "r", encoding="utf-8") as f:
                _SLA_CONFIG = json.load(f)
        else:
            _SLA_CONFIG = {"sla_policies": [], "default_sla_days": 7}
    return _SLA_CONFIG

class SLAService:
    def __init__(self):
        self.config = _load_sla_config()

    def calculate_deadline(self, category: str, from_date: Optional[datetime] = None) -> datetime:
        """Calculate SLA resolution deadline for a complaint category."""
        base_time = from_date or datetime.utcnow()
        sla_days = self.config.get("default_sla_days", 7)
        
        for policy in self.config.get("sla_policies", []):
            if policy.get("category") == category:
                sla_days = policy.get("sla_days", sla_days)
                break
                
        return base_time + timedelta(days=sla_days)

    def check_breaches(self, db: Session) -> List[Case]:
        """Find active cases where SLA deadline has passed."""
        now = datetime.utcnow()
        breached_cases = db.query(Case).filter(
            Case.status.in_(["SUBMITTED", "ACKNOWLEDGED", "ASSIGNED", "IN_PROGRESS"]),
            Case.sla_deadline.isnot(None),
            Case.sla_deadline < now,
            Case.sla_breached == False
        ).all()
        return breached_cases

    def get_cases_approaching_deadline(self, db: Session, hours_window: int = 24) -> List[Case]:
        """Find active cases reaching SLA deadline within hours_window."""
        now = datetime.utcnow()
        window_end = now + timedelta(hours=hours_window)
        return db.query(Case).filter(
            Case.status.in_(["SUBMITTED", "ACKNOWLEDGED", "ASSIGNED", "IN_PROGRESS"]),
            Case.sla_deadline.isnot(None),
            Case.sla_deadline >= now,
            Case.sla_deadline <= window_end
        ).all()

sla_service = SLAService()
