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
    academic_level: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    institution: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    program_degree: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    academic_year: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    status: Mapped[str] = mapped_column(
        String(50),
        default="uploaded",
        nullable=False,
        comment="uploaded, processing, extracted, confirmed, archived",
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
    document_id: Mapped[Optional[str]] = mapped_column(
        String(36),
        ForeignKey("documents.id", ondelete="SET NULL"),
        nullable=True,
    )
    raw_extracted_json: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    activated_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    # Relationships
    syllabus: Mapped["Syllabus"] = relationship("Syllabus", back_populates="versions")
    subjects: Mapped[List["Subject"]] = relationship("Subject", back_populates="syllabus_version")
