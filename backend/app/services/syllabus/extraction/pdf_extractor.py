import os
import pypdf
from typing import List
from app.services.syllabus.extraction.base import BaseDocumentExtractor, ExtractedDocument, ExtractedPage, ExtractedSection
from app.services.syllabus.extraction.normalizer import clean_academic_text
from app.services.syllabus.extraction.ocr_fallback import OCRFallbackService
from app.core.logging import logger


class PDFExtractor(BaseDocumentExtractor):
    """
    Extracts structured text from PDF syllabus documents preserving page boundaries,
    detecting scanned pages, and producing evidence-linked sections.
    """

    def extract(self, file_path: str) -> ExtractedDocument:
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"PDF file does not exist at {file_path}")

        reader = pypdf.PdfReader(file_path)
        total_pages = len(reader.pages)
        pages: List[ExtractedPage] = []
        sections: List[ExtractedSection] = []
        full_text_parts: List[str] = []
        has_scanned = False
        extraction_errors: List[str] = []

        logger.info(f"[PDFExtractor] Starting extraction for {file_path} ({total_pages} pages)")

        for page_idx, page in enumerate(reader.pages):
            page_num = page_idx + 1
            try:
                raw_text = page.extract_text() or ""
            except Exception as e:
                logger.warning(f"[PDFExtractor] Failed to extract text from page {page_num}: {e}")
                raw_text = ""
                extraction_errors.append(f"Page {page_num} read error: {str(e)}")

            is_scanned = OCRFallbackService.is_scanned_page(raw_text)
            page_confidence = 1.0
            ocr_applied = False
            if is_scanned:
                has_scanned = True
                ocr_text, ocr_conf, _ = OCRFallbackService.render_pdf_page_and_ocr(file_path, page_num)
                if ocr_text:
                    raw_text = ocr_text
                    ocr_applied = True
                    page_confidence = ocr_conf

            clean_text = clean_academic_text(raw_text)
            word_count = len(clean_text.split()) if clean_text else 0

            page_obj = ExtractedPage(
                page_number=page_num,
                raw_text=raw_text,
                clean_text=clean_text,
                has_images=len(page.images) > 0 if hasattr(page, "images") else False,
                is_scanned=is_scanned,
                word_count=word_count,
                metadata={
                    "char_count": len(clean_text),
                    "rotation": getattr(page, "rotation", 0),
                    "ocr_applied": ocr_applied,
                    "confidence": page_confidence,
                },
            )
            pages.append(page_obj)

            if clean_text:
                full_text_parts.append(f"--- Page {page_num} ---\n{clean_text}")

                # Create page-level section
                section_title = f"Page {page_num}"
                # If first line looks like a header, use it
                lines = [ln.strip() for ln in clean_text.split("\n") if ln.strip()]
                if lines and len(lines[0]) < 100:
                    section_title = f"Page {page_num}: {lines[0]}"

                sections.append(
                    ExtractedSection(
                        section_id=f"page_{page_num}",
                        section_title=section_title,
                        page_start=page_num,
                        page_end=page_num,
                        raw_text=raw_text,
                        clean_text=clean_text,
                        structural_type="page_block",
                        evidence_snippet=clean_text[:200],
                    )
                )

        full_text = "\n\n".join(full_text_parts)

        return ExtractedDocument(
            source_path=file_path,
            file_type="pdf",
            total_pages=total_pages,
            pages=pages,
            sections=sections,
            full_text=full_text,
            has_scanned_pages=has_scanned,
            extraction_errors=extraction_errors,
        )
