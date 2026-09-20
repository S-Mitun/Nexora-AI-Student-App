import uuid
from datetime import datetime, timezone
from typing import Optional
from sqlalchemy import String, Integer, Float, ForeignKey, DateTime, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base, TimestampMixin


class UserProgress(Base, TimestampMixin):
    """Concept mastery status for a student, strictly isolated by academic level."""
    __tablename__ = "user_progress"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    academic_level: Mapped[str] = mapped_column(String(50), default="undergraduate", nullable=False, index=True)
    concept_id: Mapped[str] = mapped_column(String(36), ForeignKey("concepts.id", ondelete="CASCADE"), nullable=False, index=True)
    subject_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("subjects.id", ondelete="SET NULL"), nullable=True, index=True)
    module_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("learning_modules.id", ondelete="SET NULL"), nullable=True)
    lesson_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("lessons.id", ondelete="SET NULL"), nullable=True)
    status: Mapped[str] = mapped_column(String(50), default="discovered")  # discovered, exploring, practiced, mastered
    mastery_score: Mapped[float] = mapped_column(Float, default=0.0)  # 0.0 to 1.0
    last_studied_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    user = relationship("UserProfile", back_populates="progress_records")
    concept = relationship("Concept", back_populates="progress_records")


class QuizAttempt(Base, TimestampMixin):
    """Student quiz attempt records with score and answer breakdown, scoped by academic level."""
    __tablename__ = "quiz_attempts"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    academic_level: Mapped[str] = mapped_column(String(50), default="undergraduate", nullable=False, index=True)
    concept_id: Mapped[str] = mapped_column(String(36), ForeignKey("concepts.id", ondelete="CASCADE"), nullable=False, index=True)
    subject_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("subjects.id", ondelete="SET NULL"), nullable=True)
    score: Mapped[int] = mapped_column(Integer, nullable=False)
    total_questions: Mapped[int] = mapped_column(Integer, nullable=False)
    details: Mapped[dict] = mapped_column(JSON, default=dict)

    user = relationship("UserProfile", back_populates="quiz_attempts")


class AcademicActivityLog(Base, TimestampMixin):
    """
    Event-driven academic activity log entity.
    Tracks learning milestones, lesson completions, notes, and interactions
    strictly scoped by student UUID and academic level.
    """
    __tablename__ = "learning_activity_logs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    academic_level: Mapped[str] = mapped_column(String(50), default="undergraduate", nullable=False, index=True)
    curriculum_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("curricula.id", ondelete="SET NULL"), nullable=True)
    subject_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("subjects.id", ondelete="SET NULL"), nullable=True, index=True)
    module_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("learning_modules.id", ondelete="SET NULL"), nullable=True)
    lesson_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("lessons.id", ondelete="SET NULL"), nullable=True)
    concept_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("concepts.id", ondelete="SET NULL"), nullable=True)
    action_type: Mapped[str] = mapped_column(String(50), nullable=False, index=True)  # viewed_subject, opened_module, opened_lesson, completed_lesson, started_practice, completed_practice, created_note, uploaded_material, opened_lab, opened_simulation
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    entity_type: Mapped[str] = mapped_column(String(50), nullable=False)  # subject, module, lesson, note, material, practice, lab
    entity_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    metadata_json: Mapped[dict] = mapped_column(JSON, default=dict)

    user = relationship("UserProfile", back_populates="activity_logs")
