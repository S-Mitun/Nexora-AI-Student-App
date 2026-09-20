from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional
from pydantic import BaseModel


class AcademicVectorMetadata(BaseModel):
    """
    Standardized Academic Retrieval Metadata Schema.
    Scopes vector similarity searches to the student's authoritative academic context.
    """
    user_id: Optional[str] = None
    source_id: Optional[str] = None
    source_type: str = "user_upload"  # baseline, official_curriculum, user_upload, etc.
    academic_level: Optional[str] = None
    curriculum_id: Optional[str] = None
    subject_id: Optional[str] = None
    topic_id: Optional[str] = None
    concept_id: Optional[str] = None
    document_id: Optional[str] = None
    chunk_index: Optional[int] = None
    page_number: Optional[int] = None
    language: str = "en"


class VectorDocument(BaseModel):
    id: str
    text: str
    metadata: Dict[str, Any] = {}
    embedding: Optional[List[float]] = None


class SearchResult(BaseModel):
    document: VectorDocument
    score: float


class VectorStore(ABC):
    """
    Abstract Vector Database interface.
    Allows seamlessly switching between ChromaDB, pgvector, Pinecone, or Qdrant.
    Supports scoping retrieval strictly using Academic Context metadata filters.
    """

    @abstractmethod
    async def add_documents(self, documents: List[VectorDocument]) -> List[str]:
        """Indexes documents and stores their embeddings."""
        pass

    @abstractmethod
    async def similarity_search(
        self,
        query: str,
        top_k: int = 5,
        filter_metadata: Optional[Dict[str, Any]] = None,
    ) -> List[SearchResult]:
        """Finds top-k most semantically relevant text chunks for a query."""
        pass

    @abstractmethod
    async def delete(self, ids: List[str]) -> bool:
        """Deletes vectors by ID."""
        pass
