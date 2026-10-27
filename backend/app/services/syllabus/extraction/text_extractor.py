import os
from typing import List
from app.services.syllabus.extraction.base import BaseDocumentExtractor, ExtractedDocument, ExtractedPage, ExtractedSection
from app.services.syllabus.extraction.normalizer import clean_academic_text
from app.core.logging import logger


class TextExtractor(BaseDocumentExtractor):
    """
    Extracts structured syllabus content from plain text (.txt) files.
    Identifies natural section boundaries, course outlines, and modules.
    """

    def extract(self, file_path: str) -> ExtractedDocument:
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"Text file does not exist at {file_path}")

        try:
            with open(file_path, "r", encoding="utf-8") as f:
                raw_text = f.read()
        except UnicodeDecodeError:
            with open(file_path, "r", encoding="latin-1", errors="replace") as f:
                raw_text = f.read()

        clean_text = clean_academic_text(raw_text)
        logger.info(f"[TextExtractor] Extracted {len(clean_text)} characters from {file_path}")

        # Segment by double newline or heading lines
        paragraphs = [p.strip() for p in clean_text.split("\n\n") if p.strip()]
        sections: List[ExtractedSection] = []
        for idx, para in enumerate(paragraphs):
            first_line = para.split("\n")[0].strip()
            sec_title = first_line[:80] if len(first_line) < 100 else f"Section {idx + 1}"
            sections.append(
                ExtractedSection(
                    section_id=f"txt_sec_{idx + 1}",
                    section_title=sec_title,
                    page_start=1,
                    page_end=1,
                    raw_text=para,
                    clean_text=para,
                    structural_type="text_block",
                    evidence_snippet=para[:200],
                )
            )

        page = ExtractedPage(
            page_number=1,
            raw_text=raw_text,
            clean_text=clean_text,
            has_images=False,
            is_scanned=False,
            word_count=len(clean_text.split()),
            metadata={"total_characters": len(clean_text)},
        )

        return ExtractedDocument(
            source_path=file_path,
            file_type="txt",
            total_pages=1,
            pages=[page],
            sections=sections,
            full_text=clean_text,
            has_scanned_pages=False,
            extraction_errors=[],
        )
