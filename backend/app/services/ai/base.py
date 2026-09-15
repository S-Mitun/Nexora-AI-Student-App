from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional, Type
from pydantic import BaseModel


class AIProvider(ABC):
    """
    Abstract AI Provider interface.
    Decouples NEXORA from any specific vendor (Google Gemini, OpenAI, Anthropic, Local LLMs).
    """

    @abstractmethod
    async def generate(
        self,
        prompt: str,
        system_instruction: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: Optional[int] = None,
    ) -> str:
        """Generates standard textual completion for a given student prompt."""
        pass

    @abstractmethod
    async def generate_structured(
        self,
        prompt: str,
        response_model: Type[BaseModel],
        system_instruction: Optional[str] = None,
    ) -> BaseModel:
        """Generates structured data validated strictly against a Pydantic schema."""
        pass

    @abstractmethod
    async def embed(self, text: str) -> List[float]:
        """Generates vector embedding for document chunking and semantic search."""
        pass

    @abstractmethod
    async def analyze(self, content: str, analysis_type: str) -> Dict[str, Any]:
        """Performs analytical tasks such as misconception detection, prerequisite extraction, or difficulty rating."""
        pass
