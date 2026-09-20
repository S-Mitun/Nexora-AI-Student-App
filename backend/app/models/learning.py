import uuid
from typing import List, Optional
from sqlalchemy import String, Text, Integer, Boolean, ForeignKey, JSON, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base, TimestampMixin


class Curriculum(Base, TimestampMixin):
    """Educational board or prescribed academic curriculum (e.g. CBSE, ICSE, State Board, University)."""
    __tablename__ = "curricula"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    code: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(150), nullable=False)
    board_authority: Mapped[str] = mapped_column(String(150), default="")
    education_level: Mapped[str] = mapped_column(String(50), default="class-6-10")  # class-1-5, class-6-10, class-11-12, undergraduate, postgraduate, research, custom
    board_type: Mapped[str] = mapped_column(String(50), default="national_board")  # national_board, state_board, international_board, university_degree, research, custom
    state_region: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    stream: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    program: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    country: Mapped[str] = mapped_column(String(50), default="India")
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    subjects: Mapped[List["Subject"]] = relationship("Subject", back_populates="curriculum")


class StudentSubject(Base, TimestampMixin):
    """
    Student-enrolled academic subject association.
    Decouples individual student workspaces from global/starter subjects and scopes enrollment to academic context.
    """
    __tablename__ = "student_subjects"
    __table_args__ = (
        Index("ix_student_subjects_user_level", "user_id", "academic_level"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    subject_id: Mapped[str] = mapped_column(String(36), ForeignKey("subjects.id", ondelete="CASCADE"), nullable=False, index=True)
    academic_level: Mapped[str] = mapped_column(String(50), default="undergraduate", nullable=False, index=True)
    enrollment_source: Mapped[str] = mapped_column(String(50), default="student_selected")  # curriculum_prescribed, student_selected, material_discovered, starter_explore
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    user = relationship("UserProfile", back_populates="enrolled_subjects")
    subject: Mapped["Subject"] = relationship("Subject", back_populates="student_enrollments")


class Subject(Base, TimestampMixin):
    """Broad academic domain of study (e.g., Computer Science, Physics, Mathematics)."""
    __tablename__ = "subjects"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    curriculum_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("curricula.id", ondelete="SET NULL"), nullable=True, index=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    slug: Mapped[str] = mapped_column(String(100), unique=True, index=True, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    icon: Mapped[str] = mapped_column(String(50), default="BookOpen")
    category: Mapped[str] = mapped_column(String(100), default="Computer Science & Engineering")
    difficulty_level: Mapped[str] = mapped_column(String(50), default="all-levels")
    education_level: Mapped[str] = mapped_column(String(50), default="all-levels")
    academic_domain: Mapped[str] = mapped_column(String(100), default="General")
    is_system: Mapped[bool] = mapped_column(Boolean, default=True)
    created_by_user_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("profiles.id", ondelete="SET NULL"), nullable=True)
    order_index: Mapped[int] = mapped_column(Integer, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    curriculum: Mapped[Optional["Curriculum"]] = relationship("Curriculum", back_populates="subjects")
    topics: Mapped[List["Topic"]] = relationship("Topic", back_populates="subject", cascade="all, delete-orphan", order_by="Topic.order_index")
    student_enrollments: Mapped[List["StudentSubject"]] = relationship("StudentSubject", back_populates="subject", cascade="all, delete-orphan")


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

    # Capability flags for concept-aware learning experiences
    has_simulation: Mapped[bool] = mapped_column(Boolean, default=False)
    has_visualization: Mapped[bool] = mapped_column(Boolean, default=False)
    has_practice: Mapped[bool] = mapped_column(Boolean, default=True)
    has_lab: Mapped[bool] = mapped_column(Boolean, default=False)
    has_mindmap: Mapped[bool] = mapped_column(Boolean, default=True)
    learning_modes: Mapped[list] = mapped_column(JSON, default=lambda: ["learn", "ask", "practice", "notes"])

    topic: Mapped["Topic"] = relationship("Topic", back_populates="concepts")
    learning_modules: Mapped[List["LearningModule"]] = relationship("LearningModule", back_populates="concept", cascade="all, delete-orphan", order_by="LearningModule.order_index")
    notes: Mapped[List["Note"]] = relationship("Note", back_populates="concept")
    progress_records: Mapped[List["UserProgress"]] = relationship("UserProgress", back_populates="concept")
    practice_sets = relationship("PracticeSet", back_populates="concept", cascade="all, delete-orphan")

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
    practice_sets = relationship("PracticeSet", back_populates="learning_module", cascade="all, delete-orphan")


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
    practice_sets = relationship("PracticeSet", back_populates="lesson", cascade="all, delete-orphan")


class PracticeSet(Base, TimestampMixin):
    """
    Lesson- or concept-aligned practice collection.
    Supports granular assessment checks scaled to academic level.
    """
    __tablename__ = "practice_sets"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    lesson_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("lessons.id", ondelete="CASCADE"), nullable=True, index=True)
    concept_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("concepts.id", ondelete="CASCADE"), nullable=True, index=True)
    module_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("learning_modules.id", ondelete="CASCADE"), nullable=True)
    subject_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("subjects.id", ondelete="CASCADE"), nullable=True)
    academic_level: Mapped[str] = mapped_column(String(50), default="undergraduate", index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    difficulty: Mapped[str] = mapped_column(String(50), default="intermediate")
    questions_count: Mapped[int] = mapped_column(Integer, default=5)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    lesson = relationship("Lesson", back_populates="practice_sets")
    concept = relationship("Concept", back_populates="practice_sets")
    learning_module = relationship("LearningModule", back_populates="practice_sets")
    questions: Mapped[List["PracticeQuestion"]] = relationship("PracticeQuestion", back_populates="practice_set", cascade="all, delete-orphan", order_by="PracticeQuestion.order_index")


class PracticeQuestion(Base, TimestampMixin):
    """
    Individual question within a practice set.
    Supports multiple-choice, conceptual explanations, formulas, and KaTeX notation.
    """
    __tablename__ = "practice_questions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    practice_set_id: Mapped[str] = mapped_column(String(36), ForeignKey("practice_sets.id", ondelete="CASCADE"), nullable=False, index=True)
    lesson_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)
    concept_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)
    question_text: Mapped[str] = mapped_column(Text, nullable=False)
    question_type: Mapped[str] = mapped_column(String(50), default="multiple_choice")
    options: Mapped[list] = mapped_column(JSON, default=list)
    correct_index: Mapped[int] = mapped_column(Integer, default=0)
    explanation: Mapped[str] = mapped_column(Text, nullable=False)
    difficulty: Mapped[str] = mapped_column(String(50), default="intermediate")
    points: Mapped[int] = mapped_column(Integer, default=10)
    order_index: Mapped[int] = mapped_column(Integer, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    practice_set = relationship("PracticeSet", back_populates="questions")
