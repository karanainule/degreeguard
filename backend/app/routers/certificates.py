import hashlib
import json
from uuid import uuid4
from io import BytesIO

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session
import qrcode

from app.database import get_db, Certificate, Institution, User
from app.auth import get_current_user, require_roles

router = APIRouter(prefix="/certificates", tags=["Certificates"])


class CertificateCreate(BaseModel):
    certificate_number: str
    student_name: str
    student_roll_number: str | None = None
    father_name: str | None = None
    course_name: str
    branch: str | None = None
    degree_type: str = "bachelor"
    year_of_passing: int
    cgpa: float | None = None
    total_marks: float | None = None
    obtained_marks: float | None = None
    grade: str | None = None
    date_of_issue: str | None = None
    institution_id: str | None = None

class BulkUpload(BaseModel):
    certificates: list[CertificateCreate]
    institution_id: str | None = None


@router.get("/")
def list_certificates(
    search: str = "", institution_id: str = "", year: str = "",
    degree_type: str = "", page: int = 1, limit: int = 20,
    user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    q = db.query(Certificate)
    if user.role == "institution":
        q = q.filter(Certificate.institution_id == user.institution_id)
    elif institution_id:
        q = q.filter(Certificate.institution_id == institution_id)
    if search:
        p = f"%{search}%"
        q = q.filter(
            (Certificate.student_name.ilike(p)) | (Certificate.certificate_number.ilike(p)) | (Certificate.student_roll_number.ilike(p))
        )
    if year:
        q = q.filter(Certificate.year_of_passing == int(year))
    if degree_type:
        q = q.filter(Certificate.degree_type == degree_type)

    total = q.count()
    certs = q.order_by(Certificate.created_at.desc()).offset((page - 1) * limit).limit(limit).all()

    # Attach institution names
    inst_ids = list(set(c.institution_id for c in certs))
    insts = {i.id: i.name for i in db.query(Institution).filter(Institution.id.in_(inst_ids)).all()}

    return {
        "certificates": [{**_cert_dict(c), "institution_name": insts.get(c.institution_id, "Unknown")} for c in certs],
        "total": total, "page": page, "limit": limit
    }


@router.post("/", status_code=201)
def create_certificate(data: CertificateCreate, user: User = Depends(require_roles("admin", "institution")), db: Session = Depends(get_db)):
    inst_id = user.institution_id if user.role == "institution" else data.institution_id
    if not inst_id:
        raise HTTPException(400, "Institution ID is required")
    doc_hash = _compute_hash(data.certificate_number, data.student_name, data.student_roll_number or "", str(data.year_of_passing))
    cert = Certificate(id=str(uuid4()), institution_id=inst_id, document_hash=doc_hash, **data.model_dump(exclude={"institution_id"}))
    db.add(cert)
    db.commit()
    inst = db.query(Institution).filter(Institution.id == inst_id).first()
    return {"certificate": {**_cert_dict(cert), "institution_name": inst.name if inst else "Unknown"}}


@router.post("/bulk")
def bulk_upload(data: BulkUpload, user: User = Depends(require_roles("admin", "institution")), db: Session = Depends(get_db)):
    inst_id = user.institution_id if user.role == "institution" else data.institution_id
    if not inst_id:
        raise HTTPException(400, "Institution ID is required")
    inserted, skipped = 0, 0
    for c in data.certificates:
        existing = db.query(Certificate).filter(Certificate.certificate_number == c.certificate_number, Certificate.institution_id == inst_id).first()
        if existing:
            skipped += 1
            continue
        doc_hash = _compute_hash(c.certificate_number, c.student_name, c.student_roll_number or "", str(c.year_of_passing))
        cert = Certificate(id=str(uuid4()), institution_id=inst_id, document_hash=doc_hash, **c.model_dump(exclude={"institution_id"}))
        db.add(cert)
        inserted += 1
    db.commit()
    return {"message": f"Uploaded {inserted}, skipped {skipped} duplicates", "inserted": inserted, "skipped": skipped}


@router.get("/{cert_id}/qr")
def generate_qr(cert_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    cert = db.query(Certificate).filter(Certificate.id == cert_id).first()
    if not cert:
        raise HTTPException(404, "Certificate not found")
    inst = db.query(Institution).filter(Institution.id == cert.institution_id).first()
    qr_data = json.dumps({
        "cert_id": cert.id, "cert_no": cert.certificate_number,
        "student": cert.student_name, "institution": inst.name if inst else None,
        "course": cert.course_name, "year": cert.year_of_passing, "hash": cert.document_hash
    })
    img = qrcode.make(qr_data)
    buf = BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)

    import base64
    b64 = base64.b64encode(buf.getvalue()).decode()
    return {"qr_code": f"data:image/png;base64,{b64}", "data": qr_data}


def _cert_dict(c: Certificate) -> dict:
    return {
        "id": c.id, "_id": c.id, "institution_id": c.institution_id,
        "certificate_number": c.certificate_number, "student_name": c.student_name,
        "student_roll_number": c.student_roll_number, "father_name": c.father_name,
        "course_name": c.course_name, "branch": c.branch, "degree_type": c.degree_type,
        "year_of_passing": c.year_of_passing, "cgpa": c.cgpa,
        "total_marks": c.total_marks, "obtained_marks": c.obtained_marks,
        "grade": c.grade, "date_of_issue": c.date_of_issue,
        "document_hash": c.document_hash, "status": c.status,
        "created_at": str(c.created_at) if c.created_at else None,
    }


def _compute_hash(*parts: str) -> str:
    return hashlib.sha256("|".join(parts).encode()).hexdigest()
