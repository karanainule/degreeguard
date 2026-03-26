from uuid import uuid4
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db, Institution, Certificate, AuditLog, User
from app.auth import get_current_user, require_roles

router = APIRouter(prefix="/institutions", tags=["Institutions"])


class InstitutionCreate(BaseModel):
    name: str
    code: str
    type: str
    address: str | None = None
    city: str | None = None
    established_year: int | None = None
    accreditation: str | None = None
    contact_email: str | None = None
    contact_phone: str | None = None
    website: str | None = None

class StatusUpdate(BaseModel):
    is_verified: bool | None = None
    is_blacklisted: bool | None = None
    blacklist_reason: str | None = None


@router.get("/")
def list_institutions(
    search: str = "", type: str = "", verified: str = "",
    page: int = 1, limit: int = 20,
    db: Session = Depends(get_db)
):
    q = db.query(Institution)
    if search:
        pattern = f"%{search}%"
        q = q.filter(
            (Institution.name.ilike(pattern)) | (Institution.code.ilike(pattern)) | (Institution.city.ilike(pattern))
        )
    if type:
        q = q.filter(Institution.type == type)
    if verified:
        q = q.filter(Institution.is_verified == (verified == "true"))

    total = q.count()
    institutions = q.order_by(Institution.name).offset((page - 1) * limit).limit(limit).all()

    return {
        "institutions": [_inst_to_dict(i) for i in institutions],
        "total": total, "page": page, "limit": limit
    }


@router.get("/{inst_id}")
def get_institution(inst_id: str, db: Session = Depends(get_db)):
    inst = db.query(Institution).filter(Institution.id == inst_id).first()
    if not inst:
        raise HTTPException(404, "Institution not found")
    cert_count = db.query(Certificate).filter(Certificate.institution_id == inst_id).count()
    d = _inst_to_dict(inst)
    d["certificate_count"] = cert_count
    return {"institution": d}


@router.post("/", status_code=201)
def create_institution(data: InstitutionCreate, user: User = Depends(require_roles("admin")), db: Session = Depends(get_db)):
    if db.query(Institution).filter(Institution.code == data.code).first():
        raise HTTPException(409, "Institution code already exists")
    inst = Institution(id=str(uuid4()), **data.model_dump())
    db.add(inst)
    db.add(AuditLog(user_id=user.id, action="CREATE_INSTITUTION", entity_type="institution", entity_id=inst.id, details=f"Created: {data.name}"))
    db.commit()
    return {"institution": _inst_to_dict(inst)}


@router.patch("/{inst_id}/status")
def update_status(inst_id: str, data: StatusUpdate, user: User = Depends(require_roles("admin")), db: Session = Depends(get_db)):
    inst = db.query(Institution).filter(Institution.id == inst_id).first()
    if not inst:
        raise HTTPException(404, "Institution not found")
    if data.is_verified is not None:
        inst.is_verified = data.is_verified
    if data.is_blacklisted is not None:
        inst.is_blacklisted = data.is_blacklisted
        inst.blacklist_reason = data.blacklist_reason
    db.commit()
    db.refresh(inst)
    return {"institution": _inst_to_dict(inst)}


def _inst_to_dict(inst: Institution) -> dict:
    return {
        "_id": inst.id, "id": inst.id, "name": inst.name, "code": inst.code, "type": inst.type,
        "address": inst.address, "city": inst.city, "state": inst.state,
        "established_year": inst.established_year, "accreditation": inst.accreditation,
        "contact_email": inst.contact_email, "contact_phone": inst.contact_phone,
        "website": inst.website, "is_verified": inst.is_verified,
        "is_blacklisted": inst.is_blacklisted, "blacklist_reason": inst.blacklist_reason,
        "created_at": str(inst.created_at) if inst.created_at else None,
    }
