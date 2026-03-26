import os
from datetime import datetime
from sqlalchemy import (
    create_engine, Column, String, Integer, Float, Boolean, Text,
    DateTime, ForeignKey, Index, Enum as SAEnum
)
from sqlalchemy.orm import declarative_base, sessionmaker, relationship
from app.config import settings

# Ensure data directory exists for SQLite
if settings.DATABASE_URL.startswith("sqlite"):
    os.makedirs("data", exist_ok=True)
    engine = create_engine(settings.DATABASE_URL, connect_args={"check_same_thread": False})
else:
    engine = create_engine(settings.DATABASE_URL, pool_pre_ping=True, pool_size=10)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ─── MODELS ────────────────────────────────────────────────────────────────────

class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    role = Column(String(20), nullable=False, default="verifier")  # admin, verifier, institution
    institution_id = Column(String(36), ForeignKey("institutions.id"), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    institution = relationship("Institution", back_populates="users")


class Institution(Base):
    __tablename__ = "institutions"

    id = Column(String(36), primary_key=True)
    name = Column(String(500), nullable=False)
    code = Column(String(50), unique=True, nullable=False, index=True)
    type = Column(String(30), nullable=False)  # university, college, polytechnic, institute
    address = Column(Text, nullable=True)
    city = Column(String(100), nullable=True)
    state = Column(String(100), default="")
    established_year = Column(Integer, nullable=True)
    accreditation = Column(String(50), nullable=True)
    contact_email = Column(String(255), nullable=True)
    contact_phone = Column(String(20), nullable=True)
    website = Column(String(500), nullable=True)
    is_verified = Column(Boolean, default=False)
    is_blacklisted = Column(Boolean, default=False)
    blacklist_reason = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    users = relationship("User", back_populates="institution")
    certificates = relationship("Certificate", back_populates="institution")


class Certificate(Base):
    __tablename__ = "certificates"

    id = Column(String(36), primary_key=True)
    institution_id = Column(String(36), ForeignKey("institutions.id"), nullable=False, index=True)
    certificate_number = Column(String(100), nullable=False, index=True)
    student_name = Column(String(255), nullable=False, index=True)
    student_roll_number = Column(String(50), nullable=True, index=True)
    father_name = Column(String(255), nullable=True)
    course_name = Column(String(255), nullable=False)
    branch = Column(String(255), nullable=True)
    degree_type = Column(String(30), nullable=False)  # diploma, bachelor, master, doctorate, certificate
    year_of_passing = Column(Integer, nullable=False)
    cgpa = Column(Float, nullable=True)
    total_marks = Column(Float, nullable=True)
    obtained_marks = Column(Float, nullable=True)
    grade = Column(String(10), nullable=True)
    date_of_issue = Column(String(20), nullable=True)
    document_hash = Column(String(64), nullable=True)
    photo_hash = Column(String(64), nullable=True)
    seal_hash = Column(String(64), nullable=True)
    qr_code_data = Column(Text, nullable=True)
    status = Column(String(20), default="active")  # active, revoked, expired
    metadata_json = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    institution = relationship("Institution", back_populates="certificates")

    __table_args__ = (
        Index("idx_cert_inst_number", "institution_id", "certificate_number", unique=True),
    )


class VerificationRequest(Base):
    __tablename__ = "verification_requests"

    id = Column(String(36), primary_key=True)
    requester_id = Column(String(36), ForeignKey("users.id"), nullable=True)
    requester_name = Column(String(255), nullable=False)
    requester_email = Column(String(255), nullable=False)
    requester_organization = Column(String(255), nullable=True)
    purpose = Column(String(30), nullable=False)  # employment, admission, scholarship, government, other
    certificate_number = Column(String(100), nullable=True)
    student_name = Column(String(255), nullable=True)
    institution_name = Column(String(500), nullable=True)
    uploaded_file_path = Column(String(500), nullable=True)
    uploaded_file_hash = Column(String(64), nullable=True)
    ocr_extracted_data = Column(Text, nullable=True)
    verification_status = Column(String(20), default="pending", index=True)  # pending, processing, verified, suspicious, forged, inconclusive
    confidence_score = Column(Float, default=0.0)
    anomalies_detected = Column(Text, nullable=True)  # JSON array
    matched_certificate_id = Column(String(36), ForeignKey("certificates.id"), nullable=True)
    reviewer_id = Column(String(36), ForeignKey("users.id"), nullable=True)
    reviewer_notes = Column(Text, nullable=True)
    reviewed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class Alert(Base):
    __tablename__ = "alerts"

    id = Column(String(36), primary_key=True)
    type = Column(String(30), nullable=False)  # forgery_detected, bulk_anomaly, blacklist_match, suspicious_pattern, system
    severity = Column(String(10), nullable=False)  # low, medium, high, critical
    title = Column(String(500), nullable=False)
    description = Column(Text, nullable=True)
    related_entity_type = Column(String(30), nullable=True)
    related_entity_id = Column(String(36), nullable=True)
    is_read = Column(Boolean, default=False)
    is_resolved = Column(Boolean, default=False)
    resolved_by = Column(String(36), nullable=True)
    resolved_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class Blacklist(Base):
    __tablename__ = "blacklist"

    id = Column(String(36), primary_key=True)
    entity_type = Column(String(20), nullable=False)  # individual, institution, certificate
    entity_name = Column(String(255), nullable=False)
    entity_identifier = Column(String(255), nullable=True)
    reason = Column(Text, nullable=False)
    reported_by = Column(String(36), ForeignKey("users.id"), nullable=True)
    evidence = Column(Text, nullable=True)
    status = Column(String(20), default="active")  # active, resolved, under_review
    created_at = Column(DateTime, default=datetime.utcnow)


class AuditLog(Base):
    __tablename__ = "audit_log"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String(36), nullable=True)
    action = Column(String(50), nullable=False)
    entity_type = Column(String(30), nullable=True)
    entity_id = Column(String(36), nullable=True)
    details = Column(Text, nullable=True)
    ip_address = Column(String(45), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


def init_db():
    Base.metadata.create_all(bind=engine)
    print("[OK] Database tables created")
