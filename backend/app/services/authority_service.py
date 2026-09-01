import json
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from backend.app.models.models import Authority
from backend.app.config import settings

class AuthorityService:
    def get_by_authority_id(self, db: Session, authority_id: str) -> Optional[Authority]:
        return db.query(Authority).filter(Authority.authority_id == authority_id).first()

    def get_parent_authority(self, db: Session, current_authority: Authority) -> Optional[Authority]:
        """Fetch parent authority in escalation hierarchy."""
        if not current_authority.parent_authority_id:
            return None
        return db.query(Authority).filter(Authority.authority_id == current_authority.parent_authority_id).first()

    def list_authorities(self, db: Session, limit: int = 100) -> List[Authority]:
        return db.query(Authority).limit(limit).all()

    def verify_authority(self, db: Session, authority_id: str, status: str = "VERIFIED") -> Optional[Authority]:
        auth = self.get_by_authority_id(db, authority_id)
        if auth:
            auth.verification_status = status
            db.commit()
            db.refresh(auth)
        return auth

authority_service = AuthorityService()
