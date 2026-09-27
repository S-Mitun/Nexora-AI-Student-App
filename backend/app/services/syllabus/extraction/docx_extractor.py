import os
from typing import List
import docx
from app.services.syllabus.extraction.base import BaseDocumentExtractor, ExtractedDocument, ExtractedPage, ExtractedSection
from app.services.syllabus.extraction.normalizer import clean_academic_text
from app.core.logging import logger


class DocxExtractor(BaseDocumentExtractor):
    """
    Extracts structured syllabus content from Microsoft Word (.docx) files.
    Preserves heading hierarchies, tables, list items, and structural paragraphs.
    """

    def extract(self, file_path: str) -> ExtractedDocument:
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"DOCX file does not exist at {file_path}")

        doc = docx.Document(file_path)
        pages: List[ExtractedPage] = []
        sections: List[ExtractedSection] = []
        collected_lines: List[str] = []
        current_section_title = "Document Body"
        current_section_lines: List[str] = []
        section_idx = 1

        logger.info(f"[DocxExtractor] Starting extraction for {file_path}")

        # Extract paragraphs with heading detection
        for p in doc.paragraphs:
            text = clean_academic_text(p.text)
            if not text:
                continue

            collected_lines.append(text)
            style_name = (p.style.name if p.style else "").lower()

            # Check if this paragraph is a heading
            if "heading" in style_name or (len(text) < 120 and text.isupper()):
                if current_section_lines:
                    # Flush previous section
                    sec_text = "\n".join(current_section_lines)
                    sections.append(
                        ExtractedSection(
                            section_id=f"docx_sec_{section_idx}",
                            section_title=current_section_title,
                            page_start=1,
                            page_end=1,
                            raw_text=sec_text,
                            clean_text=sec_text,
                            structural_type="heading_block",
                            evidence_snippet=sec_text[:200],
                        )
                    )
                    section_idx += 1
                    current_section_lines = []
                current_section_title = text

            current_section_lines.append(text)

        # Extract tables
        for tbl in doc.tables:
            table_rows: List[str] = []
            for row in tbl.rows:
                cell_texts = [clean_academic_text(cell.text) for cell in row.cells]
                # Filter out redundant adjacent duplicate cells from merged rows
                unique_cells = []
                for c in cell_texts:
                    if not unique_cells or c != unique_cells[-1]:
                        unique_cells.append(c)
                if any(unique_cells):
                    table_rows.append(" | ".join(unique_cells))
            if table_rows:
                table_str = "\n".join(table_rows)
                collected_lines.append(f"\n[Table Data]:\n{table_str}\n")
                current_section_lines.append(f"\n[Table Data]:\n{table_str}\n")

        # Flush final section
        if current_section_lines:
            sec_text = "\n".join(current_section_lines)
            sections.append(
                ExtractedSection(
                    section_id=f"docx_sec_{section_idx}",
                    section_title=current_section_title,
                    page_start=1,
                    page_end=1,
                    raw_text=sec_text,
                    clean_text=sec_text,
                    structural_type="body_block",
                    evidence_snippet=sec_text[:200],
                )
            )

        full_text = "\n\n".join(collected_lines)
        single_page = ExtractedPage(
            page_number=1,
            raw_text=full_text,
            clean_text=full_text,
            has_images=False,
            is_scanned=False,
            word_count=len(full_text.split()),
            metadata={"paragraph_count": len(doc.paragraphs), "table_count": len(doc.tables)},
        )
        pages.append(single_page)

        return ExtractedDocument(
            source_path=file_path,
            file_type="docx",
            total_pages=1,
            pages=pages,
            sections=sections,
            full_text=full_text,
            has_scanned_pages=False,
            extraction_errors=[],
        )
