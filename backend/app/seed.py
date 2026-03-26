"""Seed the database with demo institutions, certificates, users, and sample verifications."""
import hashlib
from uuid import uuid4
from datetime import datetime
from sqlalchemy.orm import Session

from app.database import (
    SessionLocal, User, Institution, Certificate, VerificationRequest, Alert
)
from app.auth import hash_password


def seed_database():
    db: Session = SessionLocal()

    # Check if already seeded
    if db.query(User).filter(User.email == "admin@degreeguard.in").first():
        print("[OK] Database already seeded")
        db.close()
        return

    print("[INFO] Seeding database...")

    # ── Institutions ──
    institutions = [
        Institution(
            id=str(uuid4()), name="JSPM's Jayawantrao Sawant College of Engineering Pune",
            code="JSPM001", type="institute", city="Pune", state="Maharashtra",
            established_year=2004, accreditation="NAAC A", is_verified=True,
            address="S.No. 80, Pune-Mumbai Bypass Highway, Tathawade, Pune - 411033",
            contact_email="info@jspmrscoe.edu.in", website="https://www.jspmrscoe.edu.in"
        ),
        Institution(
            id=str(uuid4()), name="D Y Patil College of Engineering",
            code="DYP001", type="institute", city="Pune", state="Maharashtra",
            established_year=1984, accreditation="NAAC A+", is_verified=True,
            address="Sant Tukaram Nagar, Pimpri, Pune - 411018",
            contact_email="principal@dypcoe.edu.in", website="https://www.dypcoeakurdi.ac.in"
        ),
        Institution(
            id=str(uuid4()), name="Pune Institute of Computer Technology",
            code="PICT001", type="institute", city="Pune", state="Maharashtra",
            established_year=1983, accreditation="NAAC A++", is_verified=True,
            address="Survey No. 27, Near Trimurti Chowk, Bharati Vidyapeeth Campus, Dhankawadi, Pune - 411043",
            contact_email="admin@pict.edu", website="https://www.pict.edu"
        ),
        Institution(
            id=str(uuid4()), name="College of Engineering Pune",
            code="COEP001", type="institute", city="Pune", state="Maharashtra",
            established_year=1854, accreditation="NAAC A+", is_verified=True,
            address="Wellesley Road, Shivajinagar, Pune - 411005",
            contact_email="registrar@coep.org.in", website="https://www.coep.org.in"
        ),
    ]
    db.add_all(institutions)
    db.flush()

    # ── Users ──
    db.add(User(id=str(uuid4()), email="admin@degreeguard.in", password_hash=hash_password("admin123"), full_name="System Administrator", role="admin"))
    db.add(User(id=str(uuid4()), email="verifier@company.com", password_hash=hash_password("verify123"), full_name="HR Verifier", role="verifier"))
    db.add(User(id=str(uuid4()), email="registrar@jspmrscoe.edu.in", password_hash=hash_password("inst123"), full_name="Registrar - JSPM JSCOE", role="institution", institution_id=institutions[0].id))

    # ── Certificates ──
    # (institution_index, cert_no, student_name, roll_no, course, degree_type, year, cgpa)
    certs_data = [
        (0, "JSPM/2023/B.TECH/001", "Aarav Sharma",    "JSPM20190001", "B.Tech (Computer Engineering)",       "bachelor", 2023, 9.1),
        (0, "JSPM/2022/B.TECH/047", "Sneha Patil",     "JSPM20180047", "B.Tech (Mechanical Engineering)",     "bachelor", 2022, 8.3),
        (1, "DYP/2023/B.TECH/112",  "Rohan Deshmukh",  "DYP20190112",  "B.Tech (Electronics & Telecom)",      "bachelor", 2023, 8.7),
        (1, "DYP/2024/M.TECH/023",  "Priya Kulkarni",  "DYP20220023",  "M.Tech (Computer Engineering)",       "master",   2024, 9.2),
        (2, "PICT/2023/B.TECH/067", "Ankit Joshi",     "PICT20190067", "B.Tech (Information Technology)",     "bachelor", 2023, 9.4),
        (2, "PICT/2024/M.TECH/011", "Riya Bhosale",    "PICT20220011", "M.Tech (Computer Science)",           "master",   2024, 9.0),
        (3, "COEP/2023/B.TECH/089", "Vikram Jadhav",   "COEP20190089", "B.Tech (Civil Engineering)",          "bachelor", 2023, 8.5),
        (3, "COEP/2022/B.TECH/034", "Neha Wagh",       "COEP20180034", "B.Tech (Electrical Engineering)",     "bachelor", 2022, 8.8),
    ]
    for idx, cert_no, name, roll, course, deg, year, cgpa in certs_data:
        doc_hash = hashlib.sha256(f"{cert_no}|{name}|{roll}|{year}".encode()).hexdigest()
        db.add(Certificate(
            id=str(uuid4()), institution_id=institutions[idx].id,
            certificate_number=cert_no, student_name=name, student_roll_number=roll,
            course_name=course, degree_type=deg, year_of_passing=year, cgpa=cgpa,
            document_hash=doc_hash, date_of_issue=f"{year}-07-15", status="active"
        ))

    # ── Sample Verifications ──
    ver_data = [
        ("TCS HR Dept",       "hr@tcs.com",                  "TCS",          "employment",   "JSPM/2023/B.TECH/001", "Aarav Sharma",   "JSPM JSCOE Pune",               "verified",    98.5, None, "2024-12-01"),
        ("Infosys Recruiter", "recruit@infosys.com",          "Infosys",      "government",   "FAKE/2023/XYZ",        "Rajan Mehta",    "Unknown Engineering College",   "forged",       5.2, '["Institution not found in registry","Certificate number format invalid","No matching records"]', "2024-12-15"),
        ("IIM Pune",          "admissions@iimpune.ac.in",     "IIM Pune",     "admission",    "PICT/2023/B.TECH/067", "Ankit Joshi",    "PICT Pune",                     "verified",    99.1, None, "2025-01-05"),
        ("Scholarship Board", "scholarship@gov.in",           "Govt",         "scholarship",  "COEP/2023/B.TECH/089", "Vikram Jadhav",  "College of Engineering Pune",   "verified",    97.8, None, "2025-01-20"),
        ("Unknown Employer",  "jobs@startup.io",              "Startup",      "employment",   "DYP/2023/B.TECH/999",  "Fake Person",    "D Y Patil College",             "suspicious",  22.3, '["Certificate number not in database","Course not offered","Formatting inconsistencies"]', "2025-02-10"),
    ]
    for rn, re_, ro, pu, cn, sn, inn, st, cs, an, dt in ver_data:
        db.add(VerificationRequest(
            id=str(uuid4()), requester_name=rn, requester_email=re_,
            requester_organization=ro, purpose=pu, certificate_number=cn,
            student_name=sn, institution_name=inn, verification_status=st,
            confidence_score=cs, anomalies_detected=an,
            created_at=datetime.fromisoformat(dt)
        ))

    # ── Alerts ──
    db.add(Alert(id=str(uuid4()), type="forgery_detected", severity="critical", title="Forged Certificate Detected", description='Certificate from "Unknown Engineering College" detected — institution does not exist in registry.', created_at=datetime.fromisoformat("2024-12-15")))
    db.add(Alert(id=str(uuid4()), type="suspicious_pattern", severity="high", title="Multiple Suspicious Submissions", description="3 certificates with similar formatting anomalies submitted from the same IP address.", created_at=datetime.fromisoformat("2025-01-10")))
    db.add(Alert(id=str(uuid4()), type="bulk_anomaly", severity="medium", title="Unusual Verification Spike", description="COEP Pune verifications increased 300% this week — possible bulk credential check.", created_at=datetime.fromisoformat("2025-02-01")))

    db.commit()
    db.close()
    print("[OK] Database seeded successfully")
