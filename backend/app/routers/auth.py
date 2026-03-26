from uuid import uuid4
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session

from app.database import get_db, User, AuditLog
from app.auth import hash_password, verify_password, create_access_token, get_current_user

router = APIRouter(prefix="/auth", tags=["Authentication"])


class LoginRequest(BaseModel):
    email: str
    password: str

class RegisterRequest(BaseModel):
    email: str
    password: str
    full_name: str
    role: str = "verifier"
    institution_id: str | None = None

class TokenResponse(BaseModel):
    token: str
    user: dict


@router.post("/login", response_model=TokenResponse)
def login(req: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == req.email).first()
    if not user or not verify_password(req.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is deactivated")

    token = create_access_token({"sub": user.id, "email": user.email, "role": user.role})

    db.add(AuditLog(user_id=user.id, action="LOGIN", details=f"User logged in: {user.email}"))
    db.commit()

    return {
        "token": token,
        "user": {"id": user.id, "email": user.email, "full_name": user.full_name, "role": user.role, "institution_id": user.institution_id}
    }


@router.post("/register", response_model=TokenResponse, status_code=201)
def register(req: RegisterRequest, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == req.email).first():
        raise HTTPException(status_code=409, detail="Email already registered")
    if req.role not in ("verifier", "institution"):
        raise HTTPException(status_code=400, detail="Invalid role")

    user_id = str(uuid4())
    user = User(
        id=user_id, email=req.email, password_hash=hash_password(req.password),
        full_name=req.full_name, role=req.role, institution_id=req.institution_id
    )
    db.add(user)
    db.commit()

    token = create_access_token({"sub": user_id, "email": req.email, "role": req.role})
    return {
        "token": token,
        "user": {"id": user_id, "email": req.email, "full_name": req.full_name, "role": req.role, "institution_id": req.institution_id}
    }


@router.get("/me")
def get_me(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    inst_name = None
    if user.institution and user.institution_id:
        inst_name = user.institution.name
    return {
        "user": {
            "id": user.id, "email": user.email, "full_name": user.full_name,
            "role": user.role, "institution_id": user.institution_id,
            "is_active": user.is_active, "created_at": str(user.created_at),
            "institution_name": inst_name,
        }
    }
