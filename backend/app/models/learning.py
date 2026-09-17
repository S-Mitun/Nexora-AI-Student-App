import uuid
from typing import List, Optional
from sqlalchemy import String, Text, Integer, Boolean, ForeignKey, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base, TimestampMixin


class Subject(Base, TimestampMixin):
    """Broad academic domain of study (e.g., Computer Science, Physics, Mathematics)."""
    __tablename__ = "subjects"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    slug: Mapped[str] = mapped_column(String(100), unique=True, index=True, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    icon: Mapped[str] = mapped_column(String(50), default="BookOpen")
    category: Mapped[str] = mapped_column(String(100), default="Computer Science & Engineering")
    difficulty_level: Mapped[str] = mapped_column(String(50), default="all-levels")
    order_index: Mapped[int] = mapped_column(Integer, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    topics: Mapped[List["Topic"]] = relationship("Topic", back_populates="subject", cascade="all, delete-orphan", order_by="Topic.order_index")


class Topic(Base, TimestampMixin):
    """Specific topic area within an academic subject (e.g., Arrays & Search, CPU Scheduling)."""
    __tablename__ = "topics"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    subject_id: Mapped[str] = mapped_column(String(36), ForeignKey("subjects.id", ondelete="CASCADE"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(150), nullable=False)
    slug: Mapped[str] = mapped_column(String(150), index=True, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    order_index: Mapped[int] = mapped_column(Integer, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    subject: Mapped["Subject"] = relationship("Subject", back_populates="topics")
    concepts: Mapped[List["Concept"]] = relationship("Concept", back_populates="topic", cascade="all, delete-orphan", order_by="Concept.order_index")


class Concept(Base, TimestampMixin):
    """Atomic learnable academic concept (e.g., Binary Search Tree, Invariant)."""
    __tablename__ = "concepts"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    topic_id: Mapped[str] = mapped_column(String(36), ForeignKey("topics.id", ondelete="CASCADE"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    slug: Mapped[str] = mapped_column(String(200), unique=True, index=True, nullable=False)
    summary: Mapped[str] = mapped_column(Text, nullable=False)
    short_description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    difficulty: Mapped[str] = mapped_column(String(50), default="intermediate")
    difficulty_level: Mapped[str] = mapped_column(String(50), default="intermediate")
    order_index: Mapped[int] = mapped_column(Integer, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    topic: Mapped["Topic"] = relationship("Topic", back_populates="concepts")
    learning_modules: Mapped[List["LearningModule"]] = relationship("LearningModule", back_populates="concept", cascade="all, delete-orphan", order_by="LearningModule.order_index")
    notes: Mapped[List["Note"]] = relationship("Note", back_populates="concept")
    progress_records: Mapped[List["UserProgress"]] = relationship("UserProgress", back_populates="concept")

    @property
    def learning_module(self) -> Optional["LearningModule"]:
        """Backward-compatibility accessor returning the primary learning module."""
        return self.learning_modules[0] if self.learning_modules else None


class LearningModule(Base, TimestampMixin):
    """
    Structured learning unit around a concept or cluster of concepts.
    Supports experiential blueprint and holds granular educational lessons.
    """
    __tablename__ = "learning_modules"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    concept_id: Mapped[str] = mapped_column(String(36), ForeignKey("concepts.id", ondelete="CASCADE"), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    slug: Mapped[str] = mapped_column(String(255), default="", index=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    learning_objective: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    difficulty_level: Mapped[str] = mapped_column(String(50), default="intermediate")
    estimated_minutes: Mapped[int] = mapped_column(Integer, default=15)
    order_index: Mapped[int] = mapped_column(Integer, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    why_it_matters: Mapped[str] = mapped_column(Text, default="")
    simple_explanation: Mapped[str] = mapped_column(Text, default="")
    technical_explanation: Mapped[str] = mapped_column(Text, default="")
    visualization_type: Mapped[str] = mapped_column(String(100), default="interactive-canvas")
    experiment_type: Mapped[str] = mapped_column(String(100), default="parameter-tuning")
    simulation_config: Mapped[dict] = mapped_column(JSON, default=dict)
    application_notes: Mapped[str] = mapped_column(Text, default="")
    prerequisites: Mapped[list] = mapped_column(JSON, default=list)

    concept: Mapped["Concept"] = relationship("Concept", back_populates="learning_modules")
    lessons: Mapped[List["Lesson"]] = relationship("Lesson", back_populates="learning_module", cascade="all, delete-orphan", order_by="Lesson.order_index")


class Lesson(Base, TimestampMixin):
    """
    Granular educational content unit within a learning module.
    Types: explanation, example, definition, key_points, visual, exercise, reading
    """
    __tablename__ = "lessons"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    module_id: Mapped[str] = mapped_column(String(36), ForeignKey("learning_modules.id", ondelete="CASCADE"), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    slug: Mapped[str] = mapped_column(String(255), index=True, nullable=False)
    content_type: Mapped[str] = mapped_column(String(50), default="explanation", nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    order_index: Mapped[int] = mapped_column(Integer, default=0)
    estimated_minutes: Mapped[int] = mapped_column(Integer, default=5)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    learning_module: Mapped["LearningModule"] = relationship("LearningModule", back_populates="lessons")
