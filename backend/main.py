"""
Authenticity Validator for Academia — Fake Degree Detection System
FastAPI Backend Server

Architecture:
  User → React Frontend → FastAPI Backend → OCR + AI (Tesseract + OpenCV) → PostgreSQL → Result
"""

import os
import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import init_db
from app.seed import seed_database
from app.routers import auth, institutions, certificates, verification, dashboard

# Create FastAPI app
app = FastAPI(
    title="Authenticity Validator for Academia API",
    description="Fake Degree Detection System — Document Authenticator",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL, "http://localhost:5173", "http://localhost:3000", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers — all under /api prefix
app.include_router(auth.router, prefix="/api")
app.include_router(institutions.router, prefix="/api")
app.include_router(certificates.router, prefix="/api")
app.include_router(verification.router, prefix="/api")
app.include_router(dashboard.router, prefix="/api")


@app.get("/api/health")
def health_check():
    return {"status": "ok", "version": "1.0.0", "engine": "FastAPI + Tesseract + OpenCV"}


@app.on_event("startup")
def on_startup():
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    os.makedirs("data", exist_ok=True)
    init_db()
    seed_database()
    print(f"""
  Authenticity Validator for Academia -- Fake Degree Detection API
  -----------------------------------------
  Running on http://{settings.HOST}:{settings.PORT}
  Swagger Docs: http://localhost:{settings.PORT}/api/docs
  Demo Admin: admin@degreeguard.in / admin123
  Demo Verifier: verifier@company.com / verify123
  Demo Institution: registrar@jspmrscoe.edu.in / inst123
  OCR Engine: Tesseract + OpenCV
  Database: {settings.DATABASE_URL.split('://')[0]}
    """)


if __name__ == "__main__":
    uvicorn.run("main:app", host=settings.HOST, port=settings.PORT, reload=True)
