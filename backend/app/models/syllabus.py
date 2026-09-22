import uuid
from datetime import datetime
from typing import Optional, List, TYPE_CHECKING
from sqlalchemy import String, Boolean, Integer, ForeignKey, JSON, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.profile import UserProfile
    from app.models.documents import Document
    from app.models.learning import Subject


class Syllabus(Base, TimestampMixin):
    """
    Syllabus entity representing the student's primary academic curriculum source.
    Scoped directly to user_id and academic_level.
    """
    __tablename__ = "syllabi"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
        index=True,
    )
    user_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("profiles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    academic_context_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True, index=True)
    academic_level: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    institution: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    program_degree: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    academic_year: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    status: Mapped[str] = mapped_column(
        String(50),
        default="uploaded",
        nullable=False,
        comment="uploaded, processing, processed, failed, active, archived",
    )

    # Relationships
    versions: Mapped[List["SyllabusVersion"]] = relationship(
        "SyllabusVersion",
        back_populates="syllabus",
        cascade="all, delete-orphan",
        order_by="SyllabusVersion.version_number.desc()",
    )


class SyllabusVersion(Base, TimestampMixin):
    """
    Versioned representation of a syllabus extraction and activation.
    Points to the raw document and extracted JSON, and anchors curriculum entities.
    """
    __tablename__ = "syllabus_versions"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
        index=True,
    )
    syllabus_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("syllabi.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    version_number: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    status: Mapped[str] = mapped_column(
        String(50),
        default="uploaded",
        nullable=False,
        index=True,
        comment="uploaded, processing, processed, failed, active, archived",
    )
    upload_status: Mapped[str] = mapped_column(
        String(50),
        default="uploaded",
        nullable=False,
        index=True,
        comment="pending, uploaded, verified, failed",
    )
    processing_status: Mapped[str] = mapped_column(
        String(50),
        default="not_started",
        nullable=False,
        comment="not_started, processing, completed, failed",
    )
    curriculum_status: Mapped[str] = mapped_column(
        String(50),
        default="not_built",
        nullable=False,
        index=True,
        comment="not_built, draft, review_required, active, archived",
    )
    source_filename: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    file_size_bytes: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    mime_type: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    checksum: Mapped[Optional[str]] = mapped_column(String(64), nullable=True, index=True)
    storage_path: Mapped[Optional[str]] = mapped_column(String(1024), nullable=True)
    error_message: Mapped[Optional[str]] = mapped_column(String(1024), nullable=True)
    document_id: Mapped[Optional[str]] = mapped_column(
        String(36),
        ForeignKey("documents.id", ondelete="SET NULL"),
        nullable=True,
    )
    raw_extracted_json: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    activated_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    # Relationships
    syllabus: Mapped["Syllabus"] = relationship("Syllabus", back_populates="versions")
    document: Mapped[Optional["Document"]] = relationship("Document", foreign_keys=[document_id])
    subjects: Mapped[List["Subject"]] = relationship("Subject", back_populates="syllabus_version")
