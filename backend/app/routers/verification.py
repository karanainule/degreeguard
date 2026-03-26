import os
import json
import hashlib
import re
from uuid import uuid4
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db, Certificate, Institution, VerificationRequest, Alert, User
from app.auth import get_current_user, get_optional_user, require_roles
from app.services.ocr_service import process_certificate, compute_document_hash
from app.config import settings

router = APIRouter(prefix="/verify", tags=["Verification"])

os.makedirs(settings.UPLOAD_DIR, exist_ok=True)


class QuickVerifyRequest(BaseModel):
    certificate_number: str
    student_name: str | None = None
    institution_name: str | None = None
    requester_name: str = "Anonymous"
    requester_email: str = "unknown"
    requester_organization: str | None = None
    purpose: str = "other"


@router.post("/quick")
def quick_verify(req: QuickVerifyRequest, db: Session = Depends(get_db), user: Optional[User] = Depends(get_optional_user)):
    anomalies = []
    confidence = 0.0
    status = "inconclusive"
    matched_cert = None

    # 1. Check institution
    if req.institution_name:
        pattern = f"%{req.institution_name}%"
        inst = db.query(Institution).filter(
            (Institution.name.ilike(pattern)) | (Institution.code.ilike(pattern))
        ).first()
        if not inst:
            anomalies.append("Institution not found in registry")
            confidence -= 30
        elif inst.is_blacklisted:
            anomalies.append(f"Institution is blacklisted: {inst.blacklist_reason or 'No reason specified'}")
            confidence -= 50
        elif not inst.is_verified:
            anomalies.append("Institution not yet verified in registry")
            confidence -= 10

    # 2. Search certificate in DB
    cert = db.query(Certificate).filter(Certificate.certificate_number == req.certificate_number).first()

    if cert:
        inst = db.query(Institution).filter(Institution.id == cert.institution_id).first()
        inst_name = inst.name if inst else "Unknown"
        confidence = 80

        # Name match check
        if req.student_name:
            if cert.student_name.lower().strip() == req.student_name.lower().strip():
                confidence += 15
            else:
                anomalies.append(f'Name mismatch: expected "{cert.student_name}", got "{req.student_name}"')
                confidence -= 20

        # Revocation check
        if cert.status == "revoked":
            anomalies.append("Certificate has been revoked")
            confidence = 5
            status = "forged"

        # Hash integrity
        expected_hash = hashlib.sha256(
            f"{cert.certificate_number}|{cert.student_name}|{cert.student_roll_number or ''}|{cert.year_of_passing}".encode()
        ).hexdigest()
        if cert.document_hash and cert.document_hash != expected_hash:
            anomalies.append("Document hash integrity check failed")
            confidence -= 30

        if confidence >= 80 and len(anomalies) == 0:
            status = "verified"
            confidence = min(confidence, 99.5)
        elif confidence >= 50:
            status = "suspicious"
        else:
            status = "forged"

        matched_cert = {
            "certificate_number": cert.certificate_number, "student_name": cert.student_name,
            "institution_name": inst_name, "course_name": cert.course_name,
            "year_of_passing": cert.year_of_passing, "degree_type": cert.degree_type,
            "status": cert.status
        }
    else:
        anomalies.append("Certificate number not found in any registered institution database")
        if not re.match(r'^[A-Z]{2,10}/\d{4}/[A-Z0-9./]+$', req.certificate_number):
            anomalies.append("Certificate number format does not match known institutional patterns")
            confidence -= 15
        confidence = max(confidence, 5)
        status = "forged" if len(anomalies) >= 2 else "suspicious"

    # Save verification record
    verification_id = str(uuid4())
    vr = VerificationRequest(
        id=verification_id, requester_id=user.id if user else None,
        requester_name=req.requester_name, requester_email=req.requester_email,
        requester_organization=req.requester_organization, purpose=req.purpose,
        certificate_number=req.certificate_number, student_name=req.student_name,
        institution_name=req.institution_name, verification_status=status,
        confidence_score=round(confidence, 1),
        anomalies_detected=json.dumps(anomalies) if anomalies else None,
        matched_certificate_id=cert.id if cert else None
    )
    db.add(vr)

    # Create alert if forged
    if status == "forged":
        db.add(Alert(
            id=str(uuid4()), type="forgery_detected", severity="critical",
            title=f"Forged Certificate: {req.certificate_number}",
            description=f'Certificate for "{req.student_name or "Unknown"}" flagged as forged. Anomalies: {"; ".join(anomalies)}',
            related_entity_type="verification", related_entity_id=verification_id
        ))
    db.commit()

    return {
        "verification_id": verification_id, "status": status,
        "confidence_score": round(confidence, 1), "anomalies": anomalies,
        "matched_certificate": matched_cert,
    }


@router.post("/upload")
async def upload_verify(
    document: UploadFile = File(...),
    certificate_number: str = Form(""),
    student_name: str = Form(""),
    institution_name: str = Form(""),
    requester_name: str = Form("Anonymous"),
    requester_email: str = Form("unknown"),
    requester_organization: str = Form(""),
    purpose: str = Form("other"),
    db: Session = Depends(get_db),
    user: Optional[User] = Depends(get_optional_user)
):
    """Upload a certificate document for OCR-based verification using Tesseract + OpenCV."""

    # Validate file type
    allowed_ext = {".pdf", ".png", ".jpg", ".jpeg", ".tiff", ".bmp"}
    ext = os.path.splitext(document.filename or "")[1].lower()
    if ext not in allowed_ext:
        raise HTTPException(400, f"Invalid file type. Allowed: {', '.join(allowed_ext)}")

    # Save uploaded file
    file_id = str(uuid4())
    filename = f"{file_id}{ext}"
    file_path = os.path.join(settings.UPLOAD_DIR, filename)

    content = await document.read()
    if len(content) > settings.MAX_FILE_SIZE:
        raise HTTPException(413, "File too large")

    with open(file_path, "wb") as f:
        f.write(content)

    # Compute file hash
    file_hash = hashlib.sha256(content).hexdigest()

    # Check for duplicate uploads
    existing = db.query(VerificationRequest).filter(VerificationRequest.uploaded_file_hash == file_hash).first()
    is_duplicate = existing is not None

    anomalies = []
    confidence = 50.0
    status = "processing"
    ocr_data = {}

    # ── Run OCR + AI processing pipeline (Tesseract + OpenCV) ──
    if ext in {".png", ".jpg", ".jpeg", ".tiff", ".bmp"}:
        ocr_result = process_certificate(file_path)

        ocr_data = {
            "raw_text_preview": ocr_result.raw_text[:500] if ocr_result.raw_text else "",
            "extracted_fields": {
                "student_name": ocr_result.student_name,
                "certificate_number": ocr_result.certificate_number,
                "roll_number": ocr_result.roll_number,
                "institution_name": ocr_result.institution_name,
                "course_name": ocr_result.course_name,
                "year_of_passing": ocr_result.year_of_passing,
                "cgpa": ocr_result.cgpa,
                "degree_type": ocr_result.degree_type,
                "grade": ocr_result.grade,
            },
            "image_quality_score": ocr_result.image_quality_score,
            "ocr_confidence": ocr_result.confidence,
            "tamper_indicators": ocr_result.tamper_indicators,
        }

        anomalies.extend(ocr_result.anomalies)
        anomalies.extend(ocr_result.tamper_indicators)

        # Use OCR-extracted cert number if user didn't provide one
        effective_cert_no = certificate_number or ocr_result.certificate_number
        effective_student_name = student_name or ocr_result.student_name

        # Cross-verify with database
        if effective_cert_no:
            cert = db.query(Certificate).filter(Certificate.certificate_number == effective_cert_no).first()
            if cert:
                confidence = 85
                if effective_student_name and cert.student_name.lower().strip() != effective_student_name.lower().strip():
                    anomalies.append(f'Student name mismatch: DB has "{cert.student_name}", document shows "{effective_student_name}"')
                    confidence -= 25
                # Check institution match
                if ocr_result.institution_name:
                    inst = db.query(Institution).filter(Institution.id == cert.institution_id).first()
                    if inst and ocr_result.institution_name.lower() not in inst.name.lower():
                        anomalies.append(f'Institution mismatch: DB has "{inst.name}", document shows "{ocr_result.institution_name}"')
                        confidence -= 15
                status = "verified" if confidence >= 75 else "suspicious"
            else:
                anomalies.append("Certificate number not found in database")
                confidence = 25
                status = "suspicious"
        else:
            anomalies.append("Could not extract or match certificate number")
            confidence = 30
            status = "inconclusive"

        # Quality-based adjustments
        if ocr_result.image_quality_score < 40:
            confidence -= 10
            anomalies.append(f"Low image quality score: {ocr_result.image_quality_score:.0f}/100")

    else:
        # PDF — OCR for PDFs requires pdf2image; provide info-only for now
        ocr_data = {
            "note": "PDF OCR requires pdf2image + poppler. For the demo, provide certificate details in the form fields.",
            "extracted_fields": {
                "student_name": student_name or None,
                "certificate_number": certificate_number or None,
                "institution_name": institution_name or None,
            }
        }
        if certificate_number:
            cert = db.query(Certificate).filter(Certificate.certificate_number == certificate_number).first()
            if cert:
                confidence = 85
                if student_name and cert.student_name.lower() != student_name.lower():
                    anomalies.append("Student name does not match database record")
                    confidence -= 25
                status = "verified" if confidence >= 75 else "suspicious"
            else:
                anomalies.append("Certificate number not found in database")
                confidence = 25
                status = "suspicious"

    if is_duplicate:
        anomalies.append("This exact document has been submitted before for verification")

    # Save record
    verification_id = str(uuid4())
    vr = VerificationRequest(
        id=verification_id, requester_id=user.id if user else None,
        requester_name=requester_name, requester_email=requester_email,
        requester_organization=requester_organization, purpose=purpose,
        certificate_number=certificate_number or None, student_name=student_name or None,
        institution_name=institution_name or None,
        uploaded_file_path=file_path, uploaded_file_hash=file_hash,
        ocr_extracted_data=json.dumps(ocr_data),
        verification_status=status, confidence_score=round(confidence, 1),
        anomalies_detected=json.dumps(anomalies) if anomalies else None
    )
    db.add(vr)
    db.commit()

    return {
        "verification_id": verification_id, "status": status,
        "confidence_score": round(confidence, 1), "anomalies": anomalies,
        "ocr_data": ocr_data, "file_hash": file_hash, "is_duplicate": is_duplicate
    }


@router.get("/")
def list_verifications(
    status: str = "", purpose: str = "", search: str = "",
    page: int = 1, limit: int = 15,
    user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    q = db.query(VerificationRequest)
    if user.role == "verifier":
        q = q.filter(
            (VerificationRequest.requester_id == user.id) | (VerificationRequest.requester_email == user.email)
        )
    if status:
        q = q.filter(VerificationRequest.verification_status == status)
    if purpose:
        q = q.filter(VerificationRequest.purpose == purpose)
    if search:
        p = f"%{search}%"
        q = q.filter(
            (VerificationRequest.student_name.ilike(p)) |
            (VerificationRequest.certificate_number.ilike(p)) |
            (VerificationRequest.institution_name.ilike(p))
        )

    total = q.count()
    items = q.order_by(VerificationRequest.created_at.desc()).offset((page - 1) * limit).limit(limit).all()
    return {"verifications": [_vr_dict(v) for v in items], "total": total, "page": page, "limit": limit}


@router.get("/{vid}")
def get_verification(vid: str, db: Session = Depends(get_db)):
    v = db.query(VerificationRequest).filter(VerificationRequest.id == vid).first()
    if not v:
        raise HTTPException(404, "Verification not found")
    return {"verification": _vr_dict(v)}


@router.patch("/{vid}/review")
def review_verification(vid: str, verification_status: str = "", reviewer_notes: str = "",
                        user: User = Depends(require_roles("admin")), db: Session = Depends(get_db)):
    v = db.query(VerificationRequest).filter(VerificationRequest.id == vid).first()
    if not v:
        raise HTTPException(404, "Verification not found")
    if verification_status:
        v.verification_status = verification_status
    v.reviewer_id = user.id
    v.reviewer_notes = reviewer_notes
    v.reviewed_at = datetime.utcnow()
    db.commit()
    db.refresh(v)
    return {"verification": _vr_dict(v)}



def _vr_dict(v: VerificationRequest) -> dict:
    anomalies = None
    if v.anomalies_detected:
        try:
            anomalies = json.loads(v.anomalies_detected)
        except:
            anomalies = v.anomalies_detected
    return {
        "id": v.id, "requester_name": v.requester_name, "requester_email": v.requester_email,
        "requester_organization": v.requester_organization, "purpose": v.purpose,
        "certificate_number": v.certificate_number, "student_name": v.student_name,
        "institution_name": v.institution_name, "verification_status": v.verification_status,
        "confidence_score": v.confidence_score, "anomalies_detected": anomalies,
        "ocr_extracted_data": v.ocr_extracted_data,
        "created_at": str(v.created_at) if v.created_at else None,
    }
