import uuid
from typing import List, Optional
from sqlalchemy import String, Text, Integer, ForeignKey, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base, TimestampMixin


class Subject(Base, TimestampMixin):
    """Broad domain of study (e.g., Computer Science, Physics, Mathematics)."""
    __tablename__ = "subjects"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    slug: Mapped[str] = mapped_column(String(100), unique=True, index=True, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    icon: Mapped[str] = mapped_column(String(50), default="BookOpen")
    order_index: Mapped[int] = mapped_column(Integer, default=0)

    topics: Mapped[List["Topic"]] = relationship("Topic", back_populates="subject", cascade="all, delete-orphan")


class Topic(Base, TimestampMixin):
    """Specific topic within a subject (e.g., Algorithms, Wave Mechanics)."""
    __tablename__ = "topics"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    subject_id: Mapped[str] = mapped_column(String(36), ForeignKey("subjects.id", ondelete="CASCADE"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(150), nullable=False)
    slug: Mapped[str] = mapped_column(String(150), index=True, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    order_index: Mapped[int] = mapped_column(Integer, default=0)

    subject: Mapped["Subject"] = relationship("Subject", back_populates="topics")
    concepts: Mapped[List["Concept"]] = relationship("Concept", back_populates="topic", cascade="all, delete-orphan")


class Concept(Base, TimestampMixin):
    """Atomic learnable concept (e.g., Binary Search, Doppler Effect)."""
    __tablename__ = "concepts"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    topic_id: Mapped[str] = mapped_column(String(36), ForeignKey("topics.id", ondelete="CASCADE"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    slug: Mapped[str] = mapped_column(String(200), unique=True, index=True, nullable=False)
    summary: Mapped[str] = mapped_column(Text, nullable=False)
    difficulty: Mapped[str] = mapped_column(String(50), default="intermediate")
    order_index: Mapped[int] = mapped_column(Integer, default=0)

    topic: Mapped["Topic"] = relationship("Topic", back_populates="concepts")
    learning_module: Mapped[Optional["LearningModule"]] = relationship("LearningModule", back_populates="concept", uselist=False, cascade="all, delete-orphan")
    notes: Mapped[List["Note"]] = relationship("Note", back_populates="concept")
    progress_records: Mapped[List["UserProgress"]] = relationship("UserProgress", back_populates="concept")


class LearningModule(Base, TimestampMixin):
    """
    NEXORA Experiential Learning Module
    Implements: DISCOVER -> WHY? -> UNDERSTAND -> VISUALIZE -> EXPERIMENT -> APPLY
    """
    __tablename__ = "learning_modules"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    concept_id: Mapped[str] = mapped_column(String(36), ForeignKey("concepts.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    why_it_matters: Mapped[str] = mapped_column(Text, nullable=False)
    simple_explanation: Mapped[str] = mapped_column(Text, nullable=False)
    technical_explanation: Mapped[str] = mapped_column(Text, nullable=False)
    visualization_type: Mapped[str] = mapped_column(String(100), default="interactive-canvas")
    experiment_type: Mapped[str] = mapped_column(String(100), default="parameter-tuning")
    simulation_config: Mapped[dict] = mapped_column(JSON, default=dict)
    application_notes: Mapped[str] = mapped_column(Text, nullable=False)
    prerequisites: Mapped[list] = mapped_column(JSON, default=list)

    concept: Mapped["Concept"] = relationship("Concept", back_populates="learning_module")
