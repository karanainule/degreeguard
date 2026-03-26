"""
OCR + AI Processing Service
Uses Tesseract OCR + OpenCV for document analysis and text extraction.
This is the core intelligence layer of the Fake Degree Detection System.
"""

import re
import hashlib
from typing import Optional
from dataclasses import dataclass, field

import cv2
import numpy as np
import pytesseract
from PIL import Image

from app.config import settings

# Configure Tesseract path
pytesseract.pytesseract.tesseract_cmd = settings.TESSERACT_CMD


@dataclass
class OCRResult:
    """Result from OCR processing of a certificate image/document."""
    raw_text: str = ""
    student_name: Optional[str] = None
    certificate_number: Optional[str] = None
    roll_number: Optional[str] = None
    institution_name: Optional[str] = None
    course_name: Optional[str] = None
    year_of_passing: Optional[int] = None
    cgpa: Optional[float] = None
    degree_type: Optional[str] = None
    grade: Optional[str] = None
    date_of_issue: Optional[str] = None
    confidence: float = 0.0
    anomalies: list = field(default_factory=list)
    image_quality_score: float = 0.0
    tamper_indicators: list = field(default_factory=list)


def preprocess_image(image_path: str) -> np.ndarray:
    """
    Preprocess certificate image using OpenCV for better OCR accuracy.
    Steps: grayscale → denoise → adaptive threshold → deskew
    """
    img = cv2.imread(image_path)
    if img is None:
        raise ValueError(f"Could not read image: {image_path}")

    # Convert to grayscale
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    # Denoise
    denoised = cv2.fastNlMeansDenoising(gray, h=10, templateWindowSize=7, searchWindowSize=21)

    # Increase contrast using CLAHE
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    enhanced = clahe.apply(denoised)

    # Adaptive thresholding for binarization
    binary = cv2.adaptiveThreshold(
        enhanced, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 15, 8
    )

    # Deskew: detect skew angle and rotate
    coords = np.column_stack(np.where(binary < 128))
    if len(coords) > 100:
        angle = cv2.minAreaRect(coords)[-1]
        if angle < -45:
            angle = -(90 + angle)
        else:
            angle = -angle
        if abs(angle) > 0.5 and abs(angle) < 15:
            h, w = binary.shape
            center = (w // 2, h // 2)
            M = cv2.getRotationMatrix2D(center, angle, 1.0)
            binary = cv2.warpAffine(binary, M, (w, h), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE)

    return binary


def assess_image_quality(image_path: str) -> tuple[float, list]:
    """
    Assess image quality and detect potential tampering indicators.
    Returns (quality_score 0-100, list of anomaly descriptions).
    """
    img = cv2.imread(image_path)
    if img is None:
        return 0.0, ["Could not read image file"]

    anomalies = []
    score = 100.0
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    # 1. Resolution check
    h, w = gray.shape
    if h < 500 or w < 500:
        anomalies.append(f"Low resolution image ({w}x{h}px) — may indicate screenshot or low-quality scan")
        score -= 15

    # 2. Blur detection (Laplacian variance)
    laplacian_var = cv2.Laplacian(gray, cv2.CV_64F).var()
    if laplacian_var < 50:
        anomalies.append(f"Image appears blurry (sharpness: {laplacian_var:.1f}) — possible re-scan or digital alteration")
        score -= 20
    elif laplacian_var < 100:
        anomalies.append(f"Below-average image sharpness ({laplacian_var:.1f})")
        score -= 8

    # 3. Noise level estimation
    noise_sigma = estimate_noise(gray)
    if noise_sigma > 25:
        anomalies.append(f"High noise level detected (σ={noise_sigma:.1f}) — possible editing or compression artifacts")
        score -= 15

    # 4. Edge consistency check (detect cut-paste edits)
    edges = cv2.Canny(gray, 50, 150)
    edge_density = np.sum(edges > 0) / edges.size
    if edge_density > 0.35:
        anomalies.append("Unusually high edge density — possible digital manipulation or overlaid elements")
        score -= 10

    # 5. Color distribution analysis (detect uniform patches = edits)
    if len(img.shape) == 3:
        hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
        saturation = hsv[:, :, 1]
        sat_std = np.std(saturation)
        if sat_std < 10:
            anomalies.append("Unusually uniform color distribution — may indicate digital forgery")
            score -= 12

    # 6. JPEG artifact analysis (ELA-inspired)
    # High compression artifacts in specific regions can indicate editing
    block_size = 8
    if h > block_size * 4 and w > block_size * 4:
        blocks_std = []
        for y in range(0, h - block_size, block_size * 4):
            for x in range(0, w - block_size, block_size * 4):
                block = gray[y:y + block_size, x:x + block_size].astype(float)
                blocks_std.append(np.std(block))
        if blocks_std:
            std_variation = np.std(blocks_std)
            if std_variation > 60:
                anomalies.append("Inconsistent compression artifacts across image regions — possible localized editing")
                score -= 10

    return max(score, 0), anomalies


def estimate_noise(gray_image: np.ndarray) -> float:
    """Estimate noise level using the Median Absolute Deviation method."""
    h, w = gray_image.shape
    M = np.array([[1, -2, 1], [-2, 4, -2], [1, -2, 1]])
    sigma = np.sum(np.abs(cv2.filter2D(gray_image.astype(float), -1, M)))
    sigma = sigma * np.sqrt(0.5 * np.pi) / (6 * (w - 2) * (h - 2))
    return sigma


def extract_text_ocr(image_path: str) -> tuple[str, float]:
    """
    Extract text from certificate image using Tesseract OCR.
    Returns (extracted_text, average_confidence).
    """
    try:
        # Try with preprocessed image first
        processed = preprocess_image(image_path)
        # Get detailed OCR data with confidence
        ocr_data = pytesseract.image_to_data(processed, output_type=pytesseract.Output.DICT, lang="eng")

        words = []
        confidences = []
        for i, word in enumerate(ocr_data["text"]):
            conf = int(ocr_data["conf"][i])
            if conf > 30 and word.strip():
                words.append(word.strip())
                confidences.append(conf)

        text = " ".join(words)
        avg_conf = sum(confidences) / len(confidences) if confidences else 0.0

        # If poor results, try with original image
        if avg_conf < 40 or len(words) < 5:
            text_original = pytesseract.image_to_string(Image.open(image_path), lang="eng")
            if len(text_original.split()) > len(words):
                text = text_original
                avg_conf = 50.0  # Assign moderate confidence

        return text, avg_conf

    except Exception as e:
        return f"OCR Error: {str(e)}", 0.0


def parse_certificate_fields(raw_text: str) -> dict:
    """
    Parse OCR-extracted text to identify certificate fields using regex patterns.
    Works with various certificate formats from Indian universities.
    """
    text = raw_text.upper()
    fields = {}

    # Certificate Number patterns
    cert_patterns = [
        r'(?:CERTIFICATE\s*(?:NO|NUMBER|#)[.:;\s]*)\s*([A-Z0-9/\-]+)',
        r'(?:CERT\.?\s*(?:NO|#)[.:;\s]*)\s*([A-Z0-9/\-]+)',
        r'(?:REG(?:ISTRATION)?\.?\s*(?:NO|NUMBER)[.:;\s]*)\s*([A-Z0-9/\-]+)',
        r'(?:SR\.?\s*NO[.:;\s]*)\s*([A-Z0-9/\-]+)',
        r'([A-Z]{2,6}/\d{4}/[A-Z0-9./]+)',  # Pattern like RU/2023/B.SC/001
    ]
    for pattern in cert_patterns:
        match = re.search(pattern, text)
        if match:
            fields["certificate_number"] = match.group(1).strip()
            break

    # Student Name
    name_patterns = [
        r'(?:THIS\s+IS\s+TO\s+CERTIFY\s+THAT|CERTIF(?:Y|IED)\s+THAT|NAME\s*(?:OF\s+(?:THE\s+)?(?:STUDENT|CANDIDATE))?[.:;\s]*)\s*(?:MR\.?|MS\.?|MRS\.?|SHRI\.?|SMT\.?)?\s*([A-Z][A-Z\s.]+?)(?:\s+(?:S/O|D/O|W/O|SON|DAUGHTER|HAS|ROLL|OF|FATHER))',
        r'(?:NAME)[.:;\s]+([A-Z][A-Z\s.]{3,40})',
    ]
    for pattern in name_patterns:
        match = re.search(pattern, text)
        if match:
            name = match.group(1).strip()
            name = re.sub(r'\s+', ' ', name).strip('. ')
            if len(name) > 3 and len(name) < 60:
                fields["student_name"] = name.title()
                break

    # Roll Number
    roll_patterns = [
        r'(?:ROLL\s*(?:NO|NUMBER)?[.:;\s]*)\s*([A-Z0-9/\-]+)',
        r'(?:ENROLLMENT\s*(?:NO|NUMBER)?[.:;\s]*)\s*([A-Z0-9/\-]+)',
        r'(?:EXAM\s*ROLL\s*NO[.:;\s]*)\s*([A-Z0-9/\-]+)',
    ]
    for pattern in roll_patterns:
        match = re.search(pattern, text)
        if match:
            fields["roll_number"] = match.group(1).strip()
            break

    # Course / Degree
    degree_patterns = [
        r'(?:BACHELOR|B\.?\s*(?:SC|TECH|A|COM|E|ED|ARCH|PHARM|BBA|BCA)\.?(?:\s*\([^)]+\))?)',
        r'(?:MASTER|M\.?\s*(?:SC|TECH|A|COM|E|ED|ARCH|PHARM|MBA|MCA)\.?(?:\s*\([^)]+\))?)',
        r'(?:DOCTOR(?:ATE)?|PH\.?\s*D\.?)',
        r'(?:DIPLOMA\s+IN\s+[A-Z\s]+)',
    ]
    for pattern in degree_patterns:
        match = re.search(pattern, text)
        if match:
            fields["course_name"] = match.group(0).strip()
            if "BACHELOR" in match.group(0) or "B." in match.group(0):
                fields["degree_type"] = "bachelor"
            elif "MASTER" in match.group(0) or "M." in match.group(0):
                fields["degree_type"] = "master"
            elif "DOCTOR" in match.group(0) or "PH" in match.group(0):
                fields["degree_type"] = "doctorate"
            elif "DIPLOMA" in match.group(0):
                fields["degree_type"] = "diploma"
            break

    # Year of Passing
    year_patterns = [
        r'(?:YEAR\s*(?:OF\s*)?(?:PASSING|COMPLETION|EXAMINATION)[.:;\s]*)\s*(\d{4})',
        r'(?:SESSION|BATCH)[.:;\s]*\d{4}\s*[-/]\s*(\d{4})',
        r'(?:PASSED|COMPLETED|AWARDED)\s+(?:IN\s+)?(?:THE\s+)?(?:YEAR\s+)?(\d{4})',
    ]
    for pattern in year_patterns:
        match = re.search(pattern, text)
        if match:
            year = int(match.group(1))
            if 1960 <= year <= 2030:
                fields["year_of_passing"] = year
                break

    # CGPA / Percentage
    cgpa_patterns = [
        r'(?:CGPA|GPA|CPI)[.:;\s]*(\d+\.?\d*)\s*(?:/|OUT\s*OF)\s*(\d+\.?\d*)',
        r'(?:CGPA|GPA|CPI)[.:;\s]*(\d+\.?\d*)',
        r'(?:PERCENTAGE|PERCENT|%)[.:;\s]*(\d+\.?\d*)',
    ]
    for pattern in cgpa_patterns:
        match = re.search(pattern, text)
        if match:
            val = float(match.group(1))
            if val <= 10:
                fields["cgpa"] = val
            elif val <= 100:
                fields["cgpa"] = round(val / 10, 1)
            break

    # Institution name
    inst_patterns = [
        r'((?:UNIVERSITY|INSTITUTE|COLLEGE|POLYTECHNIC|VIDYAPEETH|VISHWAVIDYALAYA)\s+(?:OF\s+)?[A-Z\s,]+)',
        r'([A-Z][A-Z\s]+(?:UNIVERSITY|INSTITUTE|COLLEGE))',
    ]
    for pattern in inst_patterns:
        match = re.search(pattern, text)
        if match:
            name = match.group(1).strip()
            if len(name) > 5:
                fields["institution_name"] = name.title()
                break

    # Grade
    grade_patterns = [
        r'(?:GRADE|DIVISION|CLASS)[.:;\s]*(FIRST|SECOND|THIRD|DISTINCTION|PASS|A\+?|B\+?|C\+?|O)',
    ]
    for pattern in grade_patterns:
        match = re.search(pattern, text)
        if match:
            fields["grade"] = match.group(1).strip()
            break

    return fields


def compute_document_hash(file_path: str) -> str:
    """Compute SHA-256 hash of document file."""
    sha256 = hashlib.sha256()
    with open(file_path, "rb") as f:
        for chunk in iter(lambda: f.read(8192), b""):
            sha256.update(chunk)
    return sha256.hexdigest()


def process_certificate(image_path: str) -> OCRResult:
    """
    Full processing pipeline for a certificate image:
    1. Assess image quality + detect tampering
    2. Extract text via OCR
    3. Parse structured fields
    4. Return comprehensive result
    """
    result = OCRResult()

    # Step 1: Image quality & tampering analysis
    quality_score, tamper_indicators = assess_image_quality(image_path)
    result.image_quality_score = quality_score
    result.tamper_indicators = tamper_indicators

    if quality_score < 20:
        result.anomalies.append("Image quality too poor for reliable OCR analysis")
        result.confidence = 10.0
        return result

    # Step 2: OCR text extraction
    raw_text, ocr_confidence = extract_text_ocr(image_path)
    result.raw_text = raw_text
    result.confidence = ocr_confidence

    if not raw_text or len(raw_text.split()) < 3:
        result.anomalies.append("Insufficient text could be extracted from the document")
        return result

    # Step 3: Parse fields from extracted text
    fields = parse_certificate_fields(raw_text)
    result.student_name = fields.get("student_name")
    result.certificate_number = fields.get("certificate_number")
    result.roll_number = fields.get("roll_number")
    result.institution_name = fields.get("institution_name")
    result.course_name = fields.get("course_name")
    result.year_of_passing = fields.get("year_of_passing")
    result.cgpa = fields.get("cgpa")
    result.degree_type = fields.get("degree_type")
    result.grade = fields.get("grade")

    # Step 4: Field-level anomaly checks
    if not result.certificate_number:
        result.anomalies.append("Could not extract certificate number from document")
    if not result.student_name:
        result.anomalies.append("Could not extract student name from document")
    if not result.institution_name:
        result.anomalies.append("Could not identify institution name on certificate")
    if result.year_of_passing and (result.year_of_passing > 2026 or result.year_of_passing < 1960):
        result.anomalies.append(f"Suspicious year of passing: {result.year_of_passing}")

    # Adjust confidence based on field extraction success
    extracted_count = sum(1 for v in [result.student_name, result.certificate_number, result.roll_number,
                                       result.institution_name, result.course_name, result.year_of_passing] if v)
    result.confidence = min(result.confidence, (extracted_count / 6) * 100)

    return result
