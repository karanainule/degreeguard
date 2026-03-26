import json
from uuid import uuid4
from datetime import datetime
from collections import Counter

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import (get_db, Institution, Certificate, VerificationRequest, Alert, Blacklist, AuditLog, User)
from app.auth import get_current_user, require_roles

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/stats")
def get_stats(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    total_inst = db.query(Institution).count()
    verified_inst = db.query(Institution).filter(Institution.is_verified == True).count()
    blacklisted_inst = db.query(Institution).filter(Institution.is_blacklisted == True).count()
    total_certs = db.query(Certificate).count()
    total_ver = db.query(VerificationRequest).count()
    verified_c = db.query(VerificationRequest).filter(VerificationRequest.verification_status == "verified").count()
    forged_c = db.query(VerificationRequest).filter(VerificationRequest.verification_status == "forged").count()
    suspicious_c = db.query(VerificationRequest).filter(VerificationRequest.verification_status == "suspicious").count()
    pending_c = db.query(VerificationRequest).filter(VerificationRequest.verification_status == "pending").count()
    unread_alerts = db.query(Alert).filter(Alert.is_read == False).count()

    # By purpose
    all_ver = db.query(VerificationRequest).all()
    purpose_counter = Counter(v.purpose for v in all_ver)
    by_purpose = [{"purpose": p, "count": c} for p, c in purpose_counter.most_common()]

    # Trend by date
    date_map = {}
    for v in all_ver:
        d = str(v.created_at)[:10] if v.created_at else None
        if not d:
            continue
        if d not in date_map:
            date_map[d] = {"date": d, "total": 0, "verified": 0, "forged": 0, "suspicious": 0}
        date_map[d]["total"] += 1
        if v.verification_status == "verified":
            date_map[d]["verified"] += 1
        elif v.verification_status == "forged":
            date_map[d]["forged"] += 1
        elif v.verification_status == "suspicious":
            date_map[d]["suspicious"] += 1
    recent_trend = sorted(date_map.values(), key=lambda x: x["date"])[-7:]

    # Top institutions
    inst_counter = {}
    for v in all_ver:
        n = v.institution_name
        if not n:
            continue
        if n not in inst_counter:
            inst_counter[n] = {"institution_name": n, "verification_count": 0, "verified_count": 0, "forged_count": 0}
        inst_counter[n]["verification_count"] += 1
        if v.verification_status == "verified":
            inst_counter[n]["verified_count"] += 1
        elif v.verification_status == "forged":
            inst_counter[n]["forged_count"] += 1
    top_institutions = sorted(inst_counter.values(), key=lambda x: x["verification_count"], reverse=True)[:5]

    return {
        "overview": {
            "total_institutions": total_inst, "verified_institutions": verified_inst,
            "blacklisted_institutions": blacklisted_inst, "total_certificates": total_certs,
            "total_verifications": total_ver, "verified": verified_c, "forged": forged_c,
            "suspicious": suspicious_c, "pending": pending_c, "unread_alerts": unread_alerts,
            "forgery_rate": round((forged_c / total_ver * 100), 1) if total_ver > 0 else 0,
        },
        "by_purpose": by_purpose,
        "recent_trend": recent_trend,
        "top_institutions": top_institutions,
    }


@router.get("/alerts")
def list_alerts(
    unread_only: str = "", severity: str = "",
    page: int = 1, limit: int = 20,
    user: User = Depends(require_roles("admin")),
    db: Session = Depends(get_db)
):
    q = db.query(Alert)
    if unread_only == "true":
        q = q.filter(Alert.is_read == False)
    if severity:
        q = q.filter(Alert.severity == severity)
    total = q.count()
    alerts = q.order_by(Alert.created_at.desc()).offset((page - 1) * limit).limit(limit).all()
    return {"alerts": [_alert_dict(a) for a in alerts], "total": total}


@router.patch("/alerts/{alert_id}/read")
def mark_read(alert_id: str, user: User = Depends(require_roles("admin")), db: Session = Depends(get_db)):
    a = db.query(Alert).filter(Alert.id == alert_id).first()
    if a:
        a.is_read = True
        db.commit()
    return {"success": True}


@router.patch("/alerts/{alert_id}/resolve")
def resolve_alert(alert_id: str, user: User = Depends(require_roles("admin")), db: Session = Depends(get_db)):
    a = db.query(Alert).filter(Alert.id == alert_id).first()
    if a:
        a.is_resolved = True
        a.resolved_by = user.id
        a.resolved_at = datetime.utcnow()
        db.commit()
    return {"success": True}


class BlacklistCreate(BaseModel):
    entity_type: str
    entity_name: str
    entity_identifier: str | None = None
    reason: str
    evidence: str | None = None

@router.get("/blacklist")
def list_blacklist(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    items = db.query(Blacklist).order_by(Blacklist.created_at.desc()).all()
    return {"blacklist": [{"id": b.id, "entity_type": b.entity_type, "entity_name": b.entity_name, "reason": b.reason, "status": b.status, "created_at": str(b.created_at)} for b in items]}

@router.post("/blacklist", status_code=201)
def add_blacklist(data: BlacklistCreate, user: User = Depends(require_roles("admin")), db: Session = Depends(get_db)):
    bl = Blacklist(id=str(uuid4()), reported_by=user.id, **data.model_dump())
    db.add(bl)
    db.add(Alert(id=str(uuid4()), type="blacklist_match", severity="high", title=f"New blacklist: {data.entity_name}", description=f'{data.entity_type} "{data.entity_name}" blacklisted. Reason: {data.reason}'))
    db.commit()
    return {"id": bl.id, "entity_type": bl.entity_type, "entity_name": bl.entity_name, "reason": bl.reason}

@router.get("/audit")
def get_audit(page: int = 1, limit: int = 50, user: User = Depends(require_roles("admin")), db: Session = Depends(get_db)):
    total = db.query(AuditLog).count()
    logs = db.query(AuditLog).order_by(AuditLog.created_at.desc()).offset((page - 1) * limit).limit(limit).all()
    return {"logs": [{"id": l.id, "user_id": l.user_id, "action": l.action, "details": l.details, "created_at": str(l.created_at)} for l in logs], "total": total}


def _alert_dict(a: Alert) -> dict:
    return {
        "id": a.id, "_id": a.id, "type": a.type, "severity": a.severity,
        "title": a.title, "description": a.description,
        "is_read": a.is_read, "is_resolved": a.is_resolved,
        "created_at": str(a.created_at) if a.created_at else None,
    }
