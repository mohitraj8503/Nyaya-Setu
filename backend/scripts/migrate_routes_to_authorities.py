import json
from pathlib import Path
from backend.app.database import SessionLocal
from backend.app.models.models import Authority
from backend.app.config import settings

def migrate_routes():
    routes_path = settings.DATA_DIR / "routes.json"
    if not routes_path.exists():
        print(f"Routes file not found at {routes_path}")
        return

    with open(routes_path, "r", encoding="utf-8") as f:
        routes = json.load(f)

    db = SessionLocal()
    migrated_count = 0
    print(f"Migrating {len(routes)} legacy routes to authorities graph...")
    try:
        for r in routes:
            auth_code = f"AUTH-{r['id'].upper()}"
            existing = db.query(Authority).filter(Authority.authority_id == auth_code).first()
            if not existing:
                auth = Authority(
                    authority_id=auth_code,
                    department=r.get("department", "Government Department"),
                    jurisdiction="National" if ".gov.in" in r.get("portal_url", "") else "State / Municipal",
                    designation="Grievance Nodal Officer",
                    office_name=r.get("authority_name", "Public Authority"),
                    portal_url=r.get("portal_url"),
                    phone=r.get("helpline"),
                    email=f"nodal.{r['id']}@gov.in",
                    submission_method="PORTAL",
                    source_url=r.get("portal_url"),
                    source_type="official",
                    verification_status="VERIFIED"
                )
                db.add(auth)
                migrated_count += 1
                print(f"  ✓ {r['id']} → {r.get('authority_name')}")
            else:
                print(f"  • {r['id']} (already exists in database)")
        db.commit()
        print(f"Done: {migrated_count} new authorities registered (Total in directory: {db.query(Authority).count()}).")
    except Exception as e:
        db.rollback()
        print(f"Error during migration: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    migrate_routes()
