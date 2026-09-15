from abc import ABC, abstractmethod
from typing import Dict, Any, Optional
from pydantic import BaseModel


class ExportOptions(BaseModel):
    format: str = "pdf"  # pdf, docx, markdown
    include_notes: bool = True
    include_reflections: bool = True
    include_mindmap_diagram: bool = False


class DocumentExportService(ABC):
    """
    Architectural boundary for Stage 07 Learning Artifact Export.
    Generates personalized learning journey summaries rather than raw AI text dumps.
    """

    @abstractmethod
    async def export_learning_journey(
        self,
        user_id: str,
        concept_id: str,
        options: Optional[ExportOptions] = None,
    ) -> bytes:
        """Exports the student's personal notes, reflections, and mastery journey."""
        pass
