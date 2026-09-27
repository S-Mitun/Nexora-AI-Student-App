import os
from typing import List
from app.services.syllabus.extraction.base import BaseDocumentExtractor, ExtractedDocument, ExtractedPage, ExtractedSection
from app.services.syllabus.extraction.ocr_fallback import OCRFallbackService
from app.core.logging import logger


class ImageExtractor(BaseDocumentExtractor):
    """
    Extracts syllabus content from raster images (JPG, PNG, JPEG).
    Preserves original dimensions and aspect ratio, applying OCR fallback.
    """

    def extract(self, file_path: str) -> ExtractedDocument:
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"Image file does not exist at {file_path}")

        meta = OCRFallbackService.extract_image_metadata(file_path)
        logger.info(f"[ImageExtractor] Processing image {file_path} (Dimensions: {meta.get('width')}x{meta.get('height')}, Ratio: {meta.get('aspect_ratio')})")

        # Run OCR fallback
        ocr_text, confidence = OCRFallbackService.run_ocr_on_image(file_path)

        page = ExtractedPage(
            page_number=1,
            raw_text=ocr_text,
            clean_text=ocr_text,
            has_images=True,
            is_scanned=True,
            word_count=len(ocr_text.split()),
            metadata=meta,
        )

        section = ExtractedSection(
            section_id="image_page_1",
            section_title="Image Syllabus Document",
            page_start=1,
            page_end=1,
            raw_text=ocr_text,
            clean_text=ocr_text,
            structural_type="image_block",
            evidence_snippet=ocr_text[:200] if ocr_text else f"Image Document ({meta.get('width')}x{meta.get('height')})",
        )

        return ExtractedDocument(
            source_path=file_path,
            file_type="image",
            total_pages=1,
            pages=[page],
            sections=[section],
            full_text=ocr_text,
            has_scanned_pages=True,
            extraction_errors=[] if ocr_text else ["Image requires visual OCR interpretation; dimensions captured."],
        )
