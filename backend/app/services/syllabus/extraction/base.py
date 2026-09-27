from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field


class ExtractedPage(BaseModel):
    """Represents a single page or slide extracted from a primary syllabus document."""
    page_number: int
    raw_text: str = ""
    clean_text: str = ""
    has_images: bool = False
    is_scanned: bool = False
    word_count: int = 0
    tables: List[List[List[str]]] = Field(default_factory=list)
    metadata: Dict[str, Any] = Field(default_factory=dict)


class ExtractedSection(BaseModel):
    """Logical section or unit block extracted from the syllabus."""
    section_id: str
    section_title: str
    page_start: int
    page_end: int
    raw_text: str = ""
    clean_text: str = ""
    structural_type: str = "section"  # header, subject, unit, outcomes, references
    evidence_snippet: Optional[str] = None


class ExtractedDocument(BaseModel):
    """Complete structured extraction result preserving page boundaries and source references."""
    source_path: str
    file_type: str
    total_pages: int = 0
    pages: List[ExtractedPage] = Field(default_factory=list)
    sections: List[ExtractedSection] = Field(default_factory=list)
    full_text: str = ""
    has_scanned_pages: bool = False
    extraction_errors: List[str] = Field(default_factory=list)

    @property
    def raw_text(self) -> str:
        return self.full_text

    @property
    def ocr_applied(self) -> bool:
        return self.has_scanned_pages

    @property
    def scanned_pages_count(self) -> int:
        return sum(1 for p in self.pages if p.is_scanned)


class BaseDocumentExtractor(ABC):
    """Abstract base class for document format extractors."""

    @abstractmethod
    def extract(self, file_path: str) -> ExtractedDocument:
        """Extracts structured text, page boundaries, and layout from a document file."""
        pass
