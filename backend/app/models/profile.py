import uuid
from typing import Optional
from sqlalchemy import String, Text, Boolean, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base, TimestampMixin


class UserProfile(Base, TimestampMixin):
    """User profile entity prepared for Supabase Auth integration."""
    __tablename__ = "profiles"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
        index=True,
        comment="Primary key mapped to Supabase auth.users.id",
    )
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    full_name: Mapped[str] = mapped_column(String(255), nullable=True)
    avatar_url: Mapped[str] = mapped_column(String(1024), nullable=True)
    education_level: Mapped[str] = mapped_column(String(100), default="undergraduate")
    curriculum_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("curricula.id", ondelete="SET NULL"), nullable=True, index=True)
    grade_level: Mapped[str] = mapped_column(String(50), default="Class 10")
    academic_domain: Mapped[str] = mapped_column(String(100), default="General Studies")
    education_category: Mapped[str] = mapped_column(String(50), default="undergraduate")
    board_type: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    stream: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    program: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    state_region: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    degree: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    department: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    specialization: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    academic_year: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    profile_completed: Mapped[bool] = mapped_column(Boolean, default=False)
    preferred_language: Mapped[str] = mapped_column(String(50), default="en")
    institution: Mapped[str] = mapped_column(String(255), nullable=True)
    interests: Mapped[str] = mapped_column(Text, default="[]", nullable=True)
    custom_interests: Mapped[str] = mapped_column(Text, default="[]", nullable=True)
    favorite_subjects: Mapped[str] = mapped_column(Text, default="[]", nullable=True)
    learning_preferences: Mapped[str] = mapped_column(Text, default='["visual", "practical", "step_by_step"]', nullable=True)
    preferred_learning_style: Mapped[str] = mapped_column(String(50), default="visual", nullable=True)
    enable_code_mixing: Mapped[bool] = mapped_column(Boolean, default=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    # Relationships
    enrolled_subjects = relationship("StudentSubject", back_populates="user", cascade="all, delete-orphan")
    documents = relationship("Document", back_populates="user", cascade="all, delete-orphan")
    notes = relationship("Note", back_populates="user", cascade="all, delete-orphan")
    chat_sessions = relationship("ChatSession", back_populates="user", cascade="all, delete-orphan")
    progress_records = relationship("UserProgress", back_populates="user", cascade="all, delete-orphan")
    quiz_attempts = relationship("QuizAttempt", back_populates="user", cascade="all, delete-orphan")
    activity_logs = relationship("AcademicActivityLog", back_populates="user", cascade="all, delete-orphan")
