from abc import ABC, abstractmethod
from typing import Dict, Any, List
from pydantic import BaseModel


class UnifiedLearningRepresentation(BaseModel):
    document_id: str
    detected_language: str = "en"
    estimated_difficulty: str = "intermediate"
    topics: List[Dict[str, Any]] = []
    extracted_concepts: List[str] = []
    metadata: Dict[str, Any] = {}


class DocumentHarmonizationService(ABC):
    """
    Architectural boundary for Stage 06/24 Multi-Format Document Ingestion.
    Extracts, normalizes, and structures heterogeneous inputs (PDF, DOCX, PPT, TXT, Scans).
    """

    @abstractmethod
    async def extract_and_harmonize(self, file_path: str, source_type: str) -> UnifiedLearningRepresentation:
        """Processes raw student material into unified learning representations."""
        pass
