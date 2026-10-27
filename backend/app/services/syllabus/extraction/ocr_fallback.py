import os
from typing import Optional, Tuple
from app.core.logging import logger


class OCRFallbackService:
    """
    Manages OCR detection and fallback for scanned PDF pages and image syllabi.
    Guarantees that unreadable pages are truthfully flagged without hallucinating content.
    """

    MIN_MACHINE_READABLE_CHARS = 30
    MIN_MACHINE_READABLE_WORDS = 5

    @classmethod
    def is_scanned_page(cls, page_text: str, image_count: int = 0) -> bool:
        """
        Determines whether a page contains insufficient machine-readable text
        and requires OCR or visual fallback.
        """
        stripped = (page_text or "").strip()
        words = stripped.split()
        if len(stripped) < cls.MIN_MACHINE_READABLE_CHARS or len(words) < cls.MIN_MACHINE_READABLE_WORDS:
            return True
        return False

    @classmethod
    def extract_image_metadata(cls, file_path: str) -> dict:
        """
        Extracts truthful image dimensions, format, and aspect ratio without distortion.
        """
        try:
            from PIL import Image
            with Image.open(file_path) as img:
                width, height = img.size
                aspect_ratio = round(width / max(height, 1), 4)
                return {
                    "width": width,
                    "height": height,
                    "aspect_ratio": aspect_ratio,
                    "format": img.format or "UNKNOWN",
                    "mode": img.mode,
                }
        except Exception as e:
            logger.warning(f"[OCRFallback] Failed to inspect image metadata: {e}")
            return {
                "width": 0,
                "height": 0,
                "aspect_ratio": 1.0,
                "format": "UNKNOWN",
                "error": str(e),
            }

    @classmethod
    def run_ocr_on_image(cls, file_path: str) -> Tuple[str, float, list]:
        """
        Attempts OCR on an image file using rapidocr_onnxruntime.
        Returns: (extracted_text, average_confidence, line_items)
        """
        try:
            from rapidocr_onnxruntime import RapidOCR
            engine = RapidOCR()
            result, _ = engine(file_path)
            if result:
                lines = []
                confidences = []
                for item in result:
                    box, txt, score = item[0], item[1], item[2]
                    txt_clean = (txt or "").strip()
                    if txt_clean:
                        lines.append(txt_clean)
                        try:
                            confidences.append(float(score))
                        except Exception:
                            confidences.append(0.8)

                full_text = "\n".join(lines)
                avg_conf = sum(confidences) / len(confidences) if confidences else 0.85
                return full_text, avg_conf, lines
        except Exception as e:
            logger.info(f"[OCRFallback] RapidOCR failed: {e}. Preserving raw ungrounded state.")

        return "", 0.1, []

    @classmethod
    def render_pdf_page_and_ocr(cls, pdf_path: str, page_number: int) -> Tuple[str, float, list]:
        """
        Renders a scanned PDF page into a high-resolution image using pypdfium2
        and runs OCR extraction.
        """
        try:
            import pypdfium2 as pdfium
            import tempfile

            doc = pdfium.PdfDocument(pdf_path)
            if page_number < 1 or page_number > len(doc):
                return "", 0.1, []

            page = doc[page_number - 1]
            image = page.render(scale=1.5).to_pil()

            with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as tmp:
                tmp_path = tmp.name
            try:
                image.save(tmp_path)
                return cls.run_ocr_on_image(tmp_path)
            finally:
                if os.path.exists(tmp_path):
                    try:
                        os.remove(tmp_path)
                    except Exception:
                        pass
        except Exception as e:
            logger.warning(f"[OCRFallback] Failed to render and OCR PDF page {page_number}: {e}")
            return "", 0.1, []
