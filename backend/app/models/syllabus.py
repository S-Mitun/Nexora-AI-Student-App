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
    processing_jobs: Mapped[List["SyllabusProcessingJob"]] = relationship("SyllabusProcessingJob", back_populates="syllabus_version", cascade="all, delete-orphan")
    curriculum_draft: Mapped[Optional["SyllabusCurriculumDraft"]] = relationship("SyllabusCurriculumDraft", back_populates="syllabus_version", uselist=False, cascade="all, delete-orphan")


class SyllabusProcessingJob(Base, TimestampMixin):
    """Tracks asynchronous syllabus document extraction and understanding tasks."""
    __tablename__ = "syllabus_processing_jobs"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
        index=True,
    )
    syllabus_id: Mapped[Optional[str]] = mapped_column(
        String(36),
        ForeignKey("syllabi.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    syllabus_version_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("syllabus_versions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    user_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("profiles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    academic_context_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    status: Mapped[str] = mapped_column(
        String(50),
        default="queued",
        nullable=False,
        comment="queued, extracting, analyzing, completed, failed",
    )
    stage: Mapped[str] = mapped_column(String(100), default="queued", nullable=False)
    error_message: Mapped[Optional[str]] = mapped_column(String(1024), nullable=True)
    progress_percent: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    total_pages: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    processed_pages: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    started_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    # Relationships
    syllabus_version: Mapped["SyllabusVersion"] = relationship("SyllabusVersion", back_populates="processing_jobs")

    @property
    def version_id(self) -> str:
        return self.syllabus_version_id

    @version_id.setter
    def version_id(self, value: str):
        self.syllabus_version_id = value


class SyllabusCurriculumDraft(Base, TimestampMixin):
    """
    Structured curriculum draft generated from primary syllabus document understanding & compilation.
    Awaiting student / human review before activation. NOT an active curriculum.
    """
    __tablename__ = "syllabus_curriculum_drafts"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
        index=True,
    )
    syllabus_version_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("syllabus_versions.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
        index=True,
    )
    syllabus_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("syllabi.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    user_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("profiles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    academic_context_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    academic_level: Mapped[str] = mapped_column(String(50), nullable=False)
    institution: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    raw_text_summary: Mapped[Optional[str]] = mapped_column(String(4096), nullable=True)
    overall_confidence: Mapped[str] = mapped_column(String(50), default="medium", nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="review_required", nullable=False)
    compilation_status: Mapped[str] = mapped_column(
        String(50),
        default="draft_ready",
        nullable=False,
        comment="not_started, queued, compiling, draft_ready, failed",
    )
    compilation_version: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    compilation_error: Mapped[Optional[str]] = mapped_column(String(1024), nullable=True)
    compiled_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    # Relationships
    syllabus_version: Mapped["SyllabusVersion"] = relationship("SyllabusVersion", back_populates="curriculum_draft")
    subjects: Mapped[List["SyllabusDraftSubject"]] = relationship(
        "SyllabusDraftSubject",
        back_populates="draft",
        cascade="all, delete-orphan",
        order_by="SyllabusDraftSubject.sort_order",
    )
    prerequisites: Mapped[List["SyllabusDraftPrerequisite"]] = relationship(
        "SyllabusDraftPrerequisite",
        back_populates="draft",
        cascade="all, delete-orphan",
    )
    references: Mapped[List["SyllabusDraftReference"]] = relationship(
        "SyllabusDraftReference",
        back_populates="draft",
        cascade="all, delete-orphan",
        order_by="SyllabusDraftReference.sort_order",
    )


class SyllabusDraftSubject(Base, TimestampMixin):
    """Individual subject identified in the compiled curriculum draft."""
    __tablename__ = "syllabus_draft_subjects"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
        index=True,
    )
    draft_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("syllabus_curriculum_drafts.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    code: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    credits: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    semester: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    source_section_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    source_page: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    page_start: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    page_end: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    evidence_text: Mapped[Optional[str]] = mapped_column(String(2048), nullable=True)
    confidence: Mapped[str] = mapped_column(String(50), default="high", nullable=False)
    review_required: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_ambiguous: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_excluded: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    # Relationships
    draft: Mapped["SyllabusCurriculumDraft"] = relationship("SyllabusCurriculumDraft", back_populates="subjects")
    modules: Mapped[List["SyllabusDraftModule"]] = relationship(
        "SyllabusDraftModule",
        back_populates="subject",
        cascade="all, delete-orphan",
        order_by="SyllabusDraftModule.sort_order",
    )
    outcomes: Mapped[List["SyllabusDraftOutcome"]] = relationship(
        "SyllabusDraftOutcome",
        back_populates="subject",
        cascade="all, delete-orphan",
    )
    prerequisites: Mapped[List["SyllabusDraftPrerequisite"]] = relationship(
        "SyllabusDraftPrerequisite",
        back_populates="subject",
        cascade="all, delete-orphan",
    )
    references: Mapped[List["SyllabusDraftReference"]] = relationship(
        "SyllabusDraftReference",
        back_populates="subject",
        cascade="all, delete-orphan",
        order_by="SyllabusDraftReference.sort_order",
    )


class SyllabusDraftModule(Base, TimestampMixin):
    """Unit, Module, or Chapter compiled within a draft subject."""
    __tablename__ = "syllabus_draft_modules"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
        index=True,
    )
    draft_subject_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("syllabus_draft_subjects.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    display_label: Mapped[str] = mapped_column(
        String(100),
        default="Unit",
        nullable=False,
        comment="Original source terminology: Unit I, Module 1, Chapter 2",
    )
    original_label: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    sequence_order: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    source_section_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    source_page: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    page_start: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    page_end: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    evidence_text: Mapped[Optional[str]] = mapped_column(String(2048), nullable=True)
    confidence: Mapped[str] = mapped_column(String(50), default="high", nullable=False)
    review_required: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_ambiguous: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_excluded: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    # Relationships
    subject: Mapped["SyllabusDraftSubject"] = relationship("SyllabusDraftSubject", back_populates="modules")
    topics: Mapped[List["SyllabusDraftTopic"]] = relationship(
        "SyllabusDraftTopic",
        back_populates="module",
        cascade="all, delete-orphan",
        order_by="SyllabusDraftTopic.sort_order",
    )
    outcomes: Mapped[List["SyllabusDraftOutcome"]] = relationship(
        "SyllabusDraftOutcome",
        back_populates="module",
    )

    @property
    def lesson_candidates(self) -> List["SyllabusDraftTopic"]:
        return self.topics


class SyllabusDraftTopic(Base, TimestampMixin):
    """Specific topic or canonical candidate lesson within a draft unit/module."""
    __tablename__ = "syllabus_draft_topics"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
        index=True,
    )
    draft_module_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("syllabus_draft_modules.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    entity_category: Mapped[str] = mapped_column(
        String(50),
        default="topic",
        nullable=False,
        comment="topic, metadata, reference, uncertain",
    )
    is_lesson_candidate: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    lesson_candidate_title: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    source_section_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    source_page: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    page_start: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    page_end: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    evidence_text: Mapped[Optional[str]] = mapped_column(String(2048), nullable=True)
    confidence: Mapped[str] = mapped_column(String(50), default="high", nullable=False)
    review_required: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_ambiguous: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    ambiguity_reason: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    is_excluded: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    # Relationships
    module: Mapped["SyllabusDraftModule"] = relationship("SyllabusDraftModule", back_populates="topics")


class SyllabusDraftReference(Base, TimestampMixin):
    """
    Textbook, Reference Book, Author citation, or Reference URL extracted from syllabus.
    Strictly segregated from curriculum lesson topics.
    """
    __tablename__ = "syllabus_draft_references"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
        index=True,
    )
    draft_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("syllabus_curriculum_drafts.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    draft_subject_id: Mapped[Optional[str]] = mapped_column(
        String(36),
        ForeignKey("syllabus_draft_subjects.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    reference_type: Mapped[str] = mapped_column(
        String(50),
        default="textbook",
        nullable=False,
        comment="textbook, reference_book, web_reference, other",
    )
    title: Mapped[str] = mapped_column(String(512), nullable=False)
    authors: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    publisher: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    edition: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    year: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    url: Mapped[Optional[str]] = mapped_column(String(1024), nullable=True)
    raw_citation: Mapped[str] = mapped_column(String(2048), nullable=False)
    source_page: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    # Relationships
    draft: Mapped["SyllabusCurriculumDraft"] = relationship("SyllabusCurriculumDraft", back_populates="references")
    subject: Mapped[Optional["SyllabusDraftSubject"]] = relationship("SyllabusDraftSubject", back_populates="references")


class SyllabusDraftOutcome(Base, TimestampMixin):
    """Learning outcome, course outcome, or explicit objective from syllabus."""
    __tablename__ = "syllabus_draft_outcomes"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
        index=True,
    )
    draft_subject_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("syllabus_draft_subjects.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    draft_module_id: Mapped[Optional[str]] = mapped_column(
        String(36),
        ForeignKey("syllabus_draft_modules.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    outcome_type: Mapped[str] = mapped_column(String(50), default="course_outcome", nullable=False)
    scope_level: Mapped[str] = mapped_column(
        String(50),
        default="course",
        nullable=False,
        comment="course, subject, module, lesson",
    )
    origin: Mapped[str] = mapped_column(
        String(50),
        default="explicit",
        nullable=False,
        comment="explicit, inferred",
    )
    description: Mapped[str] = mapped_column(String(2048), nullable=False)
    source_section_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    source_page: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    page_start: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    page_end: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    evidence_text: Mapped[Optional[str]] = mapped_column(String(2048), nullable=True)
    confidence: Mapped[str] = mapped_column(String(50), default="high", nullable=False)
    review_required: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    # Relationships
    subject: Mapped["SyllabusDraftSubject"] = relationship("SyllabusDraftSubject", back_populates="outcomes")
    module: Mapped[Optional["SyllabusDraftModule"]] = relationship("SyllabusDraftModule", back_populates="outcomes")

    @property
    def scope(self) -> str:
        return self.scope_level

    @scope.setter
    def scope(self, value: str):
        self.scope_level = value


class SyllabusDraftPrerequisite(Base, TimestampMixin):
    """Explicit or reliably inferred prerequisite relationship within a curriculum draft."""
    __tablename__ = "syllabus_draft_prerequisites"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
        index=True,
    )
    draft_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("syllabus_curriculum_drafts.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    draft_subject_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("syllabus_draft_subjects.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    source_module_id: Mapped[Optional[str]] = mapped_column(
        String(36),
        ForeignKey("syllabus_draft_modules.id", ondelete="SET NULL"),
        nullable=True,
    )
    target_module_id: Mapped[Optional[str]] = mapped_column(
        String(36),
        ForeignKey("syllabus_draft_modules.id", ondelete="SET NULL"),
        nullable=True,
    )
    source_topic_id: Mapped[Optional[str]] = mapped_column(
        String(36),
        ForeignKey("syllabus_draft_topics.id", ondelete="SET NULL"),
        nullable=True,
    )
    target_topic_id: Mapped[Optional[str]] = mapped_column(
        String(36),
        ForeignKey("syllabus_draft_topics.id", ondelete="SET NULL"),
        nullable=True,
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(String(1024), nullable=True)
    prerequisite_type: Mapped[str] = mapped_column(
        String(50),
        default="explicit",
        nullable=False,
        comment="explicit, inferred",
    )
    confidence: Mapped[str] = mapped_column(String(50), default="medium", nullable=False)
    evidence_text: Mapped[Optional[str]] = mapped_column(String(2048), nullable=True)
    review_required: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # Relationships
    draft: Mapped["SyllabusCurriculumDraft"] = relationship("SyllabusCurriculumDraft", back_populates="prerequisites")
    subject: Mapped["SyllabusDraftSubject"] = relationship("SyllabusDraftSubject", back_populates="prerequisites")


