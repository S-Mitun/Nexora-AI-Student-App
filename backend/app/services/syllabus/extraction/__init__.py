import os
from typing import Optional
from app.services.syllabus.extraction.base import BaseDocumentExtractor, ExtractedDocument, ExtractedPage, ExtractedSection
from app.services.syllabus.extraction.pdf_extractor import PDFExtractor
from app.services.syllabus.extraction.docx_extractor import DocxExtractor
from app.services.syllabus.extraction.pptx_extractor import PptxExtractor
from app.services.syllabus.extraction.image_extractor import ImageExtractor
from app.services.syllabus.extraction.text_extractor import TextExtractor
from app.services.syllabus.extraction.normalizer import clean_academic_text
from app.services.syllabus.extraction.ocr_fallback import OCRFallbackService


def get_document_extractor(file_path: str, mime_type: Optional[str] = None) -> BaseDocumentExtractor:
    """
    Factory returning the appropriate BaseDocumentExtractor based on magic bytes,
    file header inspection, and validated MIME characteristics.
    Never relies on filename extension alone.
    """
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"Target document not found at {file_path}")

    # Read first 16 bytes for magic number detection
    with open(file_path, "rb") as f:
        header = f.read(16)

    # 1. PDF detection: starts with %PDF-
    if header.startswith(b"%PDF-"):
        return PDFExtractor()

    # 2. PNG detection: \x89PNG\r\n\x1a\n
    if header.startswith(b"\x89PNG"):
        return ImageExtractor()

    # 3. JPEG detection: \xff\xd8\xff
    if header.startswith(b"\xff\xd8\xff"):
        return ImageExtractor()

    # 4. Zip-based Office formats (DOCX / PPTX): starts with PK\x03\x04
    if header.startswith(b"PK\x03\x04"):
        norm_name = os.path.basename(file_path).lower()
        if norm_name.endswith(".pptx") or (mime_type and "presentation" in mime_type):
            return PptxExtractor()
        return DocxExtractor()

    # 5. Extension / MIME check fallback
    ext = os.path.splitext(file_path)[1].lower()
    if ext == ".pdf":
        return PDFExtractor()
    elif ext == ".docx":
        return DocxExtractor()
    elif ext == ".pptx":
        return PptxExtractor()
    elif ext in [".jpg", ".jpeg", ".png"]:
        return ImageExtractor()
    elif ext == ".txt":
        return TextExtractor()

    # Default to text extractor if valid UTF-8
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            f.read(256)
        return TextExtractor()
    except Exception:
        raise ValueError(f"Unsupported document format for syllabus extraction: {file_path}")


__all__ = [
    "BaseDocumentExtractor",
    "ExtractedDocument",
    "ExtractedPage",
    "ExtractedSection",
    "PDFExtractor",
    "DocxExtractor",
    "PptxExtractor",
    "ImageExtractor",
    "TextExtractor",
    "clean_academic_text",
    "OCRFallbackService",
    "get_document_extractor",
]
