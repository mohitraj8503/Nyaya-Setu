import pytest
from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)

def test_root():
    response = client.get("/")
    assert response.status_code == 200
    assert response.json()["platform"] == "NyayaSetu 2.0"

def test_health_check_v1():
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    assert response.json()["ok"] is True

def test_legacy_problems_search():
    response = client.get("/api/v1/problems?q=pothole")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)

def test_complaint_ai_intake_hindi():
    payload = {
        "text": "हमारे रामदासपेठ वार्ड 12 में सड़क पर बहुत बड़ा गड्ढा हो गया है और सीवर का पानी बह रहा है।",
        "language": "hi",
        "input_type": "text",
        "location": {
            "pincode": "440010",
            "address": "Ramdaspeth, Nagpur"
        }
    }
    response = client.post("/api/v2/complaints", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "case_id" in data
    assert data["case_id"].startswith("NS-")
    assert data["status"] == "ROUTE_CONFIRMED"
    assert data["location"]["ward"] == "Ward 12 (Ramdaspeth)"
    assert data["routing"]["channel"] in ["EMAIL", "PORTAL"]
    assert "drafts" in data or "complaint_draft" in data

def test_case_detail_and_timeline():
    # First create a case
    payload = {
        "text": "Nagpur civil lines open electrical wire sparking near school",
        "language": "en",
        "input_type": "text",
        "location": {"pincode": "440001"}
    }
    create_res = client.post("/api/v2/complaints", json=payload)
    assert create_res.status_code == 200
    case_id = create_res.json()["case_id"]

    # Get case details
    get_res = client.get(f"/api/v2/cases/{case_id}")
    assert get_res.status_code == 200
    assert get_res.json()["case_id"] == case_id

    # Get case timeline
    timeline_res = client.get(f"/api/v2/cases/{case_id}/timeline")
    assert timeline_res.status_code == 200
    events = timeline_res.json()
    assert len(events) >= 2
    assert events[0]["event_type"] == "CREATED"

def test_case_submission_flow():
    # Create case
    create_res = client.post("/api/v2/complaints", json={
        "text": "Garbage dump not cleared for 5 days in Dharampeth Nagpur",
        "language": "en",
        "location": {"pincode": "440010"}
    })
    case_id = create_res.json()["case_id"]

    # Submit case
    sub_res = client.post(f"/api/v2/cases/{case_id}/submit", json={"channel": "EMAIL"})
    assert sub_res.status_code == 200
    assert sub_res.json()["success"] is True
    assert sub_res.json()["status"] == "SENT"

    # Verify status changed to SUBMITTED
    get_res = client.get(f"/api/v2/cases/{case_id}")
    assert get_res.json()["status"] == "SUBMITTED"

def test_sla_escalation_flow():
    # Create case
    create_res = client.post("/api/v2/complaints", json={
        "text": "Drainage blocked causing severe waterlogging in Ward 12",
        "language": "en",
        "location": {"pincode": "440010"}
    })
    case_id = create_res.json()["case_id"]

    # Trigger escalation
    esc_res = client.post(f"/api/v2/cases/{case_id}/escalate?reason=Test+Breach")
    assert esc_res.status_code == 200
    assert esc_res.json()["escalated"] is True
    assert esc_res.json()["level"] == 1

def test_officer_queue_and_action():
    # Fetch queue
    queue_res = client.get("/api/v2/officer/queue")
    assert queue_res.status_code == 200
    data = queue_res.json()
    assert "total_active" in data
    assert "queue" in data

    # Perform action on sample seeded case
    action_res = client.post("/api/v2/officer/cases/NS-2026-000184/action?action=ACCEPT&notes=Inspected+by+JE")
    assert action_res.status_code == 200
    assert action_res.json()["action_performed"] == "ACCEPT"

def test_authorities_list_and_verify():
    res = client.get("/api/v2/authorities")
    assert res.status_code == 200
    auths = res.json()
    assert len(auths) > 0
    assert any(a["authority_id"] == "AUTH-MH-NAG-WARD-12-CIVIC" for a in auths)

def test_analytics_overview_and_heatmap():
    overview = client.get("/api/v2/analytics/overview")
    assert overview.status_code == 200
    assert "total_cases" in overview.json()

    heatmap = client.get("/api/v2/analytics/ward-heatmap")
    assert heatmap.status_code == 200
    assert len(heatmap.json()["wards"]) > 0

def test_auth_otp_flow():
    send_res = client.post("/api/v2/auth/send-otp", json={"phone": "+91-9876543210"})
    assert send_res.status_code == 200
    otp = send_res.json()["dev_otp"]

    verify_res = client.post("/api/v2/auth/verify-otp", json={
        "phone": "+91-9876543210",
        "otp": otp,
        "name": "Ranjan Singh"
    })
    assert verify_res.status_code == 200
    assert "access_token" in verify_res.json()
    assert verify_res.json()["user"]["role"] == "CITIZEN"
