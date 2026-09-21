import uuid
from typing import Optional, List
from sqlalchemy import String, Text, Integer, ForeignKey, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base, TimestampMixin


class Document(Base, TimestampMixin):
    """Uploaded student textbook, syllabus, or notes document."""
    __tablename__ = "documents"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    source_type: Mapped[str] = mapped_column(String(50), default="pdf")  # pdf, docx, txt, pptx, image
    file_path: Mapped[str] = mapped_column(String(1024), nullable=False)
    file_size_bytes: Mapped[int] = mapped_column(Integer, default=0)
    status: Mapped[str] = mapped_column(String(50), default="queued")  # queued, processing, completed, failed, retry
    
    curriculum_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("curricula.id", ondelete="SET NULL"), nullable=True, index=True)
    subject_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("subjects.id", ondelete="SET NULL"), nullable=True, index=True)
    syllabus_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("syllabi.id", ondelete="SET NULL"), nullable=True, index=True)
    document_role: Mapped[str] = mapped_column(String(50), default="secondary_material", nullable=False, index=True)
    language: Mapped[str] = mapped_column(String(10), default="en")
    version: Mapped[int] = mapped_column(Integer, default=1)
    progress_percent: Mapped[int] = mapped_column(Integer, default=0)
    processing_stage: Mapped[str] = mapped_column(String(50), default="queued")  # queued, extracting, analyzing_structure, extracting_concepts, chunking, completed, failed
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    page_count: Mapped[int] = mapped_column(Integer, default=0)
    content_hash: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    metadata_json: Mapped[dict] = mapped_column(JSON, default=dict)

    user = relationship("UserProfile", back_populates="documents")
    chunks = relationship("DocumentChunk", back_populates="document", cascade="all, delete-orphan")
    curriculum = relationship("Curriculum")
    subject = relationship("Subject")
    syllabus = relationship("Syllabus")


class DocumentChunk(Base, TimestampMixin):
    """Extracted text chunk prepared for vector embedding in vector store."""
    __tablename__ = "document_chunks"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    document_id: Mapped[str] = mapped_column(String(36), ForeignKey("documents.id", ondelete="CASCADE"), nullable=False, index=True)
    chunk_index: Mapped[int] = mapped_column(Integer, nullable=False)
    page_number: Mapped[int] = mapped_column(Integer, default=1)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    token_count: Mapped[int] = mapped_column(Integer, default=0)
    vector_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True, index=True)
    metadata_json: Mapped[dict] = mapped_column(JSON, default=dict)

    document = relationship("Document", back_populates="chunks")
