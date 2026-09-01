import uuid
from datetime import datetime
from sqlalchemy import (
    Column,
    String,
    Integer,
    Boolean,
    DateTime,
    ForeignKey,
    Text,
    JSON,
    Float,
)
from sqlalchemy.orm import relationship
from backend.app.database import Base
from backend.app.utils.datetime_utils import utc_now

def generate_uuid():
    return str(uuid.uuid4())

class User(Base):
    __tablename__ = "users"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    phone = Column(String(20), unique=True, index=True, nullable=True)
    email = Column(String(255), unique=True, index=True, nullable=True)
    name = Column(String(255), nullable=True)
    role = Column(String(50), default="CITIZEN")  # CITIZEN, OFFICER, SUPERVISOR, ADMIN
    language = Column(String(10), default="hi")
    is_verified = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    cases = relationship("Case", back_populates="citizen", foreign_keys="Case.citizen_id")

class Authority(Base):
    __tablename__ = "authorities"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    authority_id = Column(String(100), unique=True, index=True, nullable=False)
    department = Column(String(255), nullable=False)
    jurisdiction = Column(String(255), nullable=False)
    designation = Column(String(255), nullable=True)
    office_name = Column(String(255), nullable=True)
    email = Column(String(255), nullable=True)
    phone = Column(String(50), nullable=True)
    portal_url = Column(String(500), nullable=True)
    submission_method = Column(String(50), default="PORTAL")  # PORTAL, EMAIL, API, WHATSAPP, PHONE, MANUAL
    source_url = Column(String(500), nullable=True)
    source_type = Column(String(100), default="official")
    verification_status = Column(String(50), default="VERIFIED")  # VERIFIED, PENDING, EXPIRED, SUSPENDED
    last_verified_at = Column(DateTime, default=datetime.utcnow)
    valid_from = Column(DateTime, nullable=True)
    valid_until = Column(DateTime, nullable=True)
    parent_authority_id = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    officers = relationship("Officer", back_populates="authority")

class Officer(Base):
    __tablename__ = "officers"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    authority_id = Column(String(36), ForeignKey("authorities.id"), nullable=False)
    name = Column(String(255), nullable=False)
    designation = Column(String(255), nullable=True)
    phone = Column(String(50), nullable=True)
    email = Column(String(255), nullable=True)
    employee_id = Column(String(100), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    authority = relationship("Authority", back_populates="officers")

class Jurisdiction(Base):
    __tablename__ = "jurisdictions"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    code = Column(String(100), unique=True, index=True, nullable=False)  # e.g., "MH-NAG-NMC-W12"
    name = Column(String(255), nullable=False)
    type = Column(String(50), nullable=False)  # STATE, DISTRICT, MUNICIPALITY, WARD
    parent_id = Column(String(36), ForeignKey("jurisdictions.id"), nullable=True)
    pincode = Column(String(10), nullable=True, index=True)
    lat = Column(Float, nullable=True)
    lng = Column(Float, nullable=True)
    extra_data = Column(JSON, default=dict)
    created_at = Column(DateTime, default=datetime.utcnow)

class Case(Base):
    __tablename__ = "cases"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    case_id = Column(String(50), unique=True, index=True, nullable=False)  # "NS-2026-000184"
    citizen_id = Column(String(36), ForeignKey("users.id"), nullable=True)
    status = Column(String(50), default="DRAFT", index=True)
    # DRAFT, AI_REVIEW, ROUTE_CONFIRMED, READY_TO_SUBMIT, SUBMITTED, ACKNOWLEDGED, ASSIGNED, IN_PROGRESS, RESOLVED, CITIZEN_CONFIRMED, CLOSED
    
    # Multimodal & AI
    raw_input = Column(JSON, default=dict)       # {type, language, text, transcript, audio_url}
    normalized = Column(JSON, default=dict)      # {summary, category, subcategory, severity, entities, requested_action}
    ai_confidence = Column(JSON, default=dict)   # {classification, jurisdiction, authority, overall}
    
    # Location
    location = Column(JSON, default=dict)        # {lat, lng, address, pincode, ward, district, state}
    
    # Routing & Assignment
    department = Column(String(255), nullable=True)
    authority_id = Column(String(36), ForeignKey("authorities.id"), nullable=True)
    officer_id = Column(String(36), ForeignKey("officers.id"), nullable=True)
    channel = Column(String(50), default="PORTAL")
    
    # Complaint text & Filing Reference
    complaint_text = Column(Text, nullable=True)
    complaint_text_en = Column(Text, nullable=True)
    reference_id = Column(String(100), nullable=True)  # Official portal reference number
    
    # SLA & Escalation
    sla_deadline = Column(DateTime, nullable=True)
    sla_breached = Column(Boolean, default=False)
    escalation_level = Column(Integer, default=0)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    submitted_at = Column(DateTime, nullable=True)
    resolved_at = Column(DateTime, nullable=True)
    closed_at = Column(DateTime, nullable=True)

    citizen = relationship("User", back_populates="cases", foreign_keys=[citizen_id])
    events = relationship("CaseEvent", back_populates="case", cascade="all, delete-orphan", order_by="CaseEvent.created_at")
    submissions = relationship("Submission", back_populates="case", cascade="all, delete-orphan")
    escalations = relationship("Escalation", back_populates="case", cascade="all, delete-orphan")
    feedback = relationship("Feedback", back_populates="case")

class CaseEvent(Base):
    __tablename__ = "case_events"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    case_id = Column(String(36), ForeignKey("cases.id", ondelete="CASCADE"), nullable=False, index=True)
    event_type = Column(String(50), nullable=False)
    # CREATED, CLASSIFIED, CLARIFIED, ROUTED, SUBMITTED, ACKNOWLEDGED, ASSIGNED, STATUS_CHANGED, ESCALATED, REMINDER_SENT, RESOLVED, FEEDBACK_RECEIVED
    event_data = Column(JSON, default=dict)
    actor_id = Column(String(36), nullable=True)
    actor_type = Column(String(50), default="SYSTEM")  # CITIZEN, OFFICER, SYSTEM, AI
    created_at = Column(DateTime, default=datetime.utcnow)

    case = relationship("Case", back_populates="events")

class RoutingRule(Base):
    __tablename__ = "routing_rules"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    rule_id = Column(String(100), unique=True, nullable=True)
    category = Column(String(100), nullable=False, index=True)
    subcategory = Column(String(100), nullable=True)
    state_code = Column(String(10), nullable=True)
    district = Column(String(100), nullable=True)
    ward = Column(String(100), nullable=True)
    authority_id = Column(String(100), nullable=False)
    priority = Column(Integer, default=0)
    channel = Column(String(50), default="PORTAL")
    conditions = Column(JSON, default=dict)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class Submission(Base):
    __tablename__ = "submissions"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    case_id = Column(String(36), ForeignKey("cases.id"), nullable=False, index=True)
    channel = Column(String(50), nullable=False)  # PORTAL, EMAIL, API, WHATSAPP, SMS, MANUAL
    status = Column(String(50), default="SENT")    # PENDING, SENT, ACKNOWLEDGED, FAILED
    payload = Column(JSON, default=dict)
    response = Column(JSON, default=dict)
    reference_id = Column(String(100), nullable=True)
    submitted_at = Column(DateTime, default=datetime.utcnow)
    acknowledged_at = Column(DateTime, nullable=True)

    case = relationship("Case", back_populates="submissions")

class Escalation(Base):
    __tablename__ = "escalations"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    case_id = Column(String(36), ForeignKey("cases.id"), nullable=False, index=True)
    level = Column(Integer, default=1)
    from_authority_id = Column(String(100), nullable=True)
    to_authority_id = Column(String(100), nullable=True)
    reason = Column(Text, nullable=True)
    escalated_at = Column(DateTime, default=datetime.utcnow)
    resolved_at = Column(DateTime, nullable=True)

    case = relationship("Case", back_populates="escalations")

class Notification(Base):
    __tablename__ = "notifications"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    case_id = Column(String(36), ForeignKey("cases.id"), nullable=True, index=True)
    recipient_type = Column(String(50), default="CITIZEN")  # CITIZEN, OFFICER, SUPERVISOR, ADMIN
    recipient_id = Column(String(36), nullable=True)
    recipient_contact = Column(String(255), nullable=True)
    channel = Column(String(50), default="SMS")            # SMS, WHATSAPP, EMAIL
    template_key = Column(String(100), nullable=True)
    content = Column(JSON, default=dict)
    status = Column(String(50), default="SENT")            # PENDING, SENT, DELIVERED, FAILED
    sent_at = Column(DateTime, default=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)

class Feedback(Base):
    __tablename__ = "feedback"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    case_id = Column(String(36), ForeignKey("cases.id"), nullable=True)
    citizen_id = Column(String(36), ForeignKey("users.id"), nullable=True)
    rating = Column(Integer, nullable=False)
    category = Column(String(100), default="General")
    feedback_text = Column(Text, default="")
    helpful = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    case = relationship("Case", back_populates="feedback")

class Contact(Base):
    __tablename__ = "contacts"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    name = Column(String(255), nullable=False)
    email = Column(String(255), nullable=False)
    field = Column(String(255), default="General Guidance Inquiry")
    message = Column(Text, nullable=False)
    agreed_terms = Column(Boolean, default=True)
    status = Column(String(50), default="New")
    ip_address = Column(String(100), default="")
    created_at = Column(DateTime, default=datetime.utcnow)

class Newsletter(Base):
    __tablename__ = "newsletters"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    email = Column(String(255), unique=True, index=True, nullable=False)
    source_page = Column(String(100), default="Home")
    active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class AuditLog(Base):
    __tablename__ = "audit_logs"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    actor_id = Column(String(36), nullable=True)
    actor_type = Column(String(50), default="CITIZEN")
    action = Column(String(100), nullable=False)
    entity_type = Column(String(100), nullable=True)
    entity_id = Column(String(100), nullable=True)
    metadata_json = Column(JSON, default=dict)
    created_at = Column(DateTime, default=datetime.utcnow)
