# 🛡️ DegreeGuard — Fake Degree Detection System

**Final Year BE (IT) Project**
JSPM's Jayawantrao Sawant College of Engineering, Hadapsar
Savitribai Phule Pune University (SPPU)

## 🏆 Smart India Hackathon 2025

This project is developed as a solution for the **Smart India Hackathon 2025**.

- **Problem Statement ID:** 25029  
- **Title:** Authenticity Validator for Academia  
- **Organization:** Government of Jharkhand  

### 📸 Official Problem Statement
 <img width="1502" height="962" alt="image" src="https://github.com/user-attachments/assets/d05b300d-0a04-4153-a89b-f33aaf85a1f5" />


---

## 📐 Architecture

```
User (Employer / Institution)
        ↓
React Frontend (Vite + Tailwind CSS)
        ↓
FastAPI Backend (Python)
        ↓
OCR + AI Processing (Tesseract + OpenCV)
        ↓
Database Verification (PostgreSQL / SQLite)
        ↓
Result (Authentic / Suspicious / Fake)
```

## 📁 Project Structure

```
degreeguard/
├── backend/                    # FastAPI Python Backend
│   ├── main.py                 # Entry point (uvicorn)
│   ├── requirements.txt        # Python dependencies
│   ├── .env                    # Environment config
│   ├── app/
│   │   ├── config.py           # Settings loader
│   │   ├── database.py         # SQLAlchemy models + DB setup
│   │   ├── auth.py             # JWT + bcrypt authentication
│   │   ├── seed.py             # Demo data seeder
│   │   ├── routers/
│   │   │   ├── auth.py         # Login / Register / Me
│   │   │   ├── institutions.py # CRUD for institutions
│   │   │   ├── certificates.py # Certificate registry + QR
│   │   │   ├── verification.py # Quick verify + Upload OCR
│   │   │   └── dashboard.py    # Stats, alerts, blacklist, audit
│   │   └── services/
│   │       └── ocr_service.py  # Tesseract + OpenCV pipeline
│   ├── data/                   # SQLite DB (auto-created)
│   └── uploads/                # Uploaded certificates
│
├── frontend/                   # React + Vite + Tailwind
│   ├── src/
│   │   ├── pages/              # Dashboard, Verify, Institutions, etc.
│   │   ├── components/         # Layout, StatusBadge, ConfidenceMeter
│   │   ├── context/            # AuthContext (JWT state)
│   │   └── utils/              # Axios API client
│   └── index.html
│
└── README.md
```

---

## 🚀 Quick Start

### Prerequisites

- **Python 3.10+**
- **Node.js 18+**
- **Tesseract OCR** (`apt install tesseract-ocr` on Ubuntu)
- **PostgreSQL** (optional — falls back to SQLite for development)

### 1. Start Backend

```bash
cd backend

# Create virtual environment (recommended)
python -m venv venv
source venv/bin/activate    # Linux/Mac
# venv\Scripts\activate     # Windows

# Install dependencies
pip install -r requirements.txt

# Run server
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

Backend runs at **http://localhost:8000**
Swagger docs at **http://localhost:8000/api/docs**

### 2. Start Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at **http://localhost:5173**

### 3. Login with Demo Credentials

| Role        | Email                    | Password  |
|-------------|--------------------------|-----------|
| Admin       | admin@jharkhand.gov.in   | admin123  |
| Verifier    | verifier@company.com     | verify123 |
| Institution | registrar@ranchi.edu     | inst123   |

---

## 🔬 OCR + AI Processing Pipeline

The core intelligence layer (`app/services/ocr_service.py`) uses:

### OpenCV Image Preprocessing
1. **Grayscale conversion** — removes color noise
2. **CLAHE contrast enhancement** — improves text visibility
3. **Adaptive Gaussian thresholding** — binarizes for OCR
4. **Deskew detection** — corrects rotated scans
5. **Denoising** — fastNlMeansDenoising for cleaner input

### Tesseract OCR Text Extraction
- Extracts text with per-word confidence scores
- Falls back to full-page extraction if word-level confidence is low
- Parses structured fields using regex patterns for Indian certificate formats

### AI Anomaly Detection
- **Image quality scoring** (0-100) based on resolution, blur, noise
- **Tampering detection** via:
  - Laplacian variance (blur detection)
  - Edge density analysis (cut-paste detection)
  - Color distribution uniformity (digital forgery)
  - JPEG artifact inconsistency (localized editing)
  - Noise estimation (MAD method)
- **Field validation** against database records
- **Hash integrity verification** (SHA-256)

---

## ✨ Features

- **Quick Verify** — Enter certificate number for instant DB check
- **Document Upload** — Upload scanned certificates for full OCR pipeline
- **Confidence Scoring** — 0-100% confidence with visual meter
- **Anomaly Flagging** — Name mismatches, invalid formats, non-existent institutions
- **Institution Registry** — Add/verify/blacklist institutions
- **Bulk Certificate Upload** — Institutions can upload records in bulk
- **QR Code Generation** — Generate verifiable QR codes for certificates
- **Admin Dashboard** — Charts, trends, forgery rates, top institutions
- **Alerts System** — Real-time forgery alerts with severity levels
- **Audit Log** — Complete activity trail
- **Role-Based Access** — Admin, Verifier, Institution roles with JWT

---

## 🔌 API Endpoints

| Method | Endpoint                        | Description                    |
|--------|---------------------------------|--------------------------------|
| POST   | /api/auth/login                 | Login                          |
| POST   | /api/auth/register              | Register                       |
| GET    | /api/auth/me                    | Current user profile           |
| POST   | /api/verify/quick               | Quick verify by cert number    |
| POST   | /api/verify/upload              | Upload doc for OCR verify      |
| GET    | /api/verify                     | Verification history           |
| GET    | /api/institutions               | List institutions              |
| POST   | /api/institutions               | Add institution (admin)        |
| GET    | /api/certificates               | List certificates              |
| POST   | /api/certificates               | Add certificate                |
| POST   | /api/certificates/bulk          | Bulk upload                    |
| GET    | /api/certificates/{id}/qr      | Generate QR code               |
| GET    | /api/dashboard/stats            | Dashboard statistics           |
| GET    | /api/dashboard/alerts           | Alerts                         |
| GET    | /api/dashboard/audit            | Audit log                      |

Full interactive docs: **http://localhost:8000/api/docs**

---

## 🛠️ Tech Stack

| Layer       | Technology                                |
|-------------|-------------------------------------------|
| Frontend    | React 18, Vite, Tailwind CSS, Recharts    |
| Backend     | Python, FastAPI, Uvicorn                  |
| OCR Engine  | Tesseract OCR 5.x                         |
| Image AI    | OpenCV (preprocessing + tampering detect) |
| Database    | PostgreSQL (prod) / SQLite (dev)          |
| ORM         | SQLAlchemy 2.0                            |
| Auth        | JWT (python-jose) + bcrypt                |
| File Upload | python-multipart + Multer                 |
| QR Codes    | qrcode (Python)                           |

---

## 🗄️ Database Configuration

### Development (SQLite — zero config)
Default `.env` uses SQLite — works out of the box.

### Production (PostgreSQL)
```bash
# Update backend/.env
DATABASE_URL=postgresql://username:password@localhost:5432/degreeguard

# Create the database
psql -U postgres -c "CREATE DATABASE degreeguard;"
```

---

## 🏗️ Deployment

### Backend
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000
```
Deploy to: Railway, Render, DigitalOcean, or any Python host.

### Frontend
```bash
cd frontend
npm run build
# Deploy dist/ folder to Vercel, Netlify, or any static host
```

Set `VITE_API_URL` to your backend URL.

---

## 📋 Test Verification

| Certificate Number     | Expected Result  |
|------------------------|------------------|
| RU/2023/B.SC/001       | ✅ Verified       |
| BIT/2023/B.TECH/112    | ✅ Verified       |
| FAKE/2023/001          | ❌ Forged         |
| RU/2022/B.TECH/999     | ⚠️ Suspicious     |

---

## 👥 Team

Final Year BE (Information Technology) — 2024-25
JSPM's Jayawantrao Sawant College of Engineering, Hadapsar
Savitribai Phule Pune University
