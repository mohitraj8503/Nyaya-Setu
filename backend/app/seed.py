import json
from datetime import datetime, timedelta
from pathlib import Path
from sqlalchemy.orm import Session
from backend.app.database import SessionLocal, engine, Base
from backend.app.models.models import Authority, RoutingRule, Case, CaseEvent, User
from backend.app.config import settings

def seed_database():
    """Seed initial master authorities, routing rules, and sample case data."""
    Base.metadata.create_all(bind=engine)
    db: Session = SessionLocal()
    try:
        # 1. Seed Central Authorities
        central_file = settings.DATA_DIR / "authorities" / "central" / "central-authorities.json"
        if central_file.exists():
            with open(central_file, "r", encoding="utf-8") as f:
                data = json.load(f)
                for item in data.get("authorities", []):
                    existing = db.query(Authority).filter(Authority.authority_id == item["authority_id"]).first()
                    if not existing:
                        auth = Authority(
                            authority_id=item["authority_id"],
                            department=item["department"],
                            jurisdiction=item["jurisdiction"],
                            designation=item.get("designation"),
                            office_name=item.get("office_name"),
                            email=item.get("email"),
                            phone=item.get("phone"),
                            portal_url=item.get("portal_url"),
                            submission_method=item.get("submission_method", "PORTAL"),
                            source_url=item.get("source_url"),
                            verification_status=item.get("verification_status", "VERIFIED"),
                            parent_authority_id=item.get("parent_authority_id")
                        )
                        db.add(auth)

        # 2. Seed Maharashtra / Nagpur Authorities
        nagpur_file = settings.DATA_DIR / "authorities" / "maharashtra" / "nagpur-authorities.json"
        if nagpur_file.exists():
            with open(nagpur_file, "r", encoding="utf-8") as f:
                data = json.load(f)
                for item in data.get("authorities", []):
                    existing = db.query(Authority).filter(Authority.authority_id == item["authority_id"]).first()
                    if not existing:
                        auth = Authority(
                            authority_id=item["authority_id"],
                            department=item["department"],
                            jurisdiction=item["jurisdiction"],
                            designation=item.get("designation"),
                            office_name=item.get("office_name"),
                            email=item.get("email"),
                            phone=item.get("phone"),
                            portal_url=item.get("portal_url"),
                            submission_method=item.get("submission_method", "EMAIL"),
                            source_url=item.get("source_url"),
                            verification_status=item.get("verification_status", "VERIFIED"),
                            parent_authority_id=item.get("parent_authority_id")
                        )
                        db.add(auth)

        # 3. Seed Routing Rules
        rules_file = settings.DATA_DIR / "routing-rules" / "routing-rules.json"
        if rules_file.exists():
            with open(rules_file, "r", encoding="utf-8") as f:
                data = json.load(f)
                for r in data.get("rules", []):
                    existing = db.query(RoutingRule).filter(RoutingRule.rule_id == r["id"]).first()
                    if not existing:
                        rule = RoutingRule(
                            rule_id=r["id"],
                            category=r["category"],
                            subcategory=r.get("subcategory"),
                            state_code=r.get("state_code"),
                            district=r.get("district"),
                            ward=r.get("ward"),
                            authority_id=r["authority_id"],
                            priority=r.get("priority", 0),
                            channel=r.get("channel", "PORTAL")
                        )
                        db.add(rule)

        # 4. Seed a Sample Case for immediate demonstration
        existing_case = db.query(Case).filter(Case.case_id == "NS-2026-000184").first()
        if not existing_case:
            case = Case(
                case_id="NS-2026-000184",
                status="IN_PROGRESS",
                raw_input={"type": "text", "language": "hi", "text": "रामदासपेठ वार्ड 12 में सड़क पर बड़ा गड्ढा और खुला सीवर"},
                normalized={"summary": "Large pothole and open sewage in Ramdaspeth Ward 12", "category": "roads_potholes", "severity": "high"},
                ai_confidence={"classification": 0.94, "jurisdiction": 0.98, "authority": 0.95, "overall": 0.96},
                location={"pincode": "440010", "ward": "Ward 12 (Ramdaspeth)", "district": "Nagpur", "state": "Maharashtra"},
                department="Nagpur Municipal Corporation (NMC)",
                authority_id="AUTH-MH-NAG-WARD-12-CIVIC",
                channel="EMAIL",
                complaint_text="Formal complaint submitted regarding urgent road repair in Ward 12 Ramdaspeth.",
                reference_id="NMC-2026-99120",
                sla_deadline=datetime.utcnow() + timedelta(days=5),
                sla_breached=False,
                created_at=datetime.utcnow() - timedelta(days=2),
                submitted_at=datetime.utcnow() - timedelta(days=2)
            )
            db.add(case)
            db.flush()
            
            ev1 = CaseEvent(
                case_id=case.id,
                event_type="CREATED",
                event_data={"summary": "Complaint drafted via voice input"},
                actor_type="CITIZEN",
                created_at=datetime.utcnow() - timedelta(days=2)
            )
            ev2 = CaseEvent(
                case_id=case.id,
                event_type="SUBMITTED",
                event_data={"channel": "EMAIL", "reference_id": "NMC-2026-99120"},
                actor_type="SYSTEM",
                created_at=datetime.utcnow() - timedelta(days=2)
            )
            ev3 = CaseEvent(
                case_id=case.id,
                event_type="ASSIGNED",
                event_data={"officer": "Ward 12 Junior Engineer"},
                actor_type="OFFICER",
                created_at=datetime.utcnow() - timedelta(days=1)
            )
            db.add_all([ev1, ev2, ev3])

        db.commit()
    except Exception as e:
        db.rollback()
        print(f"Error seeding database: {e}")
    finally:
        db.close()
