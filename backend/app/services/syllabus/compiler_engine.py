import re
import uuid
from datetime import datetime
from typing import List, Optional, Dict, Tuple, Set

from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models.syllabus import (
    Syllabus,
    SyllabusVersion,
    SyllabusCurriculumDraft,
    SyllabusDraftSubject,
    SyllabusDraftModule,
    SyllabusDraftTopic,
    SyllabusDraftOutcome,
    SyllabusDraftPrerequisite,
)
from app.schemas.syllabus import SyllabusCompilationResult
from app.services.syllabus.draft_engine import SyllabusDraftEngine
from app.services.syllabus.job_runner import SyllabusJobRunner
from app.core.logging import logger


class SyllabusCurriculumCompilerEngine:
    """
    Authoritative Syllabus Curriculum Compiler Engine (Master Prompt 04R).
    Compiles 03R extracted evidence into a canonical, normalized curriculum draft:
    - Evidence-preserving normalization (cleans OCR artifacts & repeated headers without changing meaning).
    - Preserves source academic terminology ('Unit I', 'Module 2', 'Lab Component').
    - Compiles syllabus topics into canonical candidate lessons.
    - Detects and flags ambiguous / low-confidence items (review_required = True).
    - Eliminates duplicate entries caused by OCR or page wraps.
    - Scopes learning outcomes (course / module) and sets origin (explicit / inferred).
    - Establishes explicit and inferred prerequisite relationships.
    - Idempotent: re-compiling updates the canonical draft cleanly.
    - STRICT INVARIANT: Does NOT activate the curriculum. is_curriculum_active remains False.
    """

    REPEATED_HEADER_PATTERNS = [
        re.compile(r"(?i)^(autonomous|affiliated|department\s+of|semester\s+[0-9]+|syllabus\s+for|course\s+code).*$"),
        re.compile(r"(?i)^(page\s+\d+\s+of\s+\d+|\d+\s*/\s*\d+)$"),
        re.compile(r"(?i)^(table\s+of\s+contents|index)$"),
    ]

    NOISE_PATTERNS = [
        re.compile(r"^[\s\-_–—\.\,\:\;\*\#\(\)]+$"),
    ]

    PREREQUISITE_KEYWORDS = [
        "prerequisite", "pre-requisite", "prior knowledge", "review of",
        "assumes knowledge", "fundamental data structures", "background"
    ]

    def __init__(self, db: Session):
        self.db = db

    def compile_version(
        self,
        syllabus_id: str,
        version_id: str,
        user_id: str,
        academic_context_id: Optional[str] = None,
        force_recompile: bool = False,
    ) -> SyllabusCompilationResult:
        return self.compile_draft_from_version(
            db=self.db,
            syllabus_id=syllabus_id,
            version_id=version_id,
            user_id=user_id,
            academic_context_id=academic_context_id,
            force_recompile=force_recompile,
        )

    @classmethod
    def _clean_title(cls, text: str) -> str:
        return cls._normalize_topic_title(text)

    @classmethod
    def compile_draft_from_version(
        cls,
        db: Session,
        syllabus_id: str,
        version_id: str,
        user_id: str,
        academic_context_id: Optional[str] = None,
        force_recompile: bool = False,
    ) -> SyllabusCompilationResult:
        """
        Compiles the curriculum draft for the specified syllabus version.
        Validates ownership, authorized context, and performs atomic, idempotent compilation.
        """
        logger.info(f"[CurriculumCompiler] Starting compilation for version {version_id} (User: {user_id})")

        # 1. Validate syllabus version & user ownership
        version = (
            db.query(SyllabusVersion)
            .join(Syllabus, Syllabus.id == SyllabusVersion.syllabus_id)
            .filter(
                SyllabusVersion.id == version_id,
                Syllabus.id == syllabus_id,
                Syllabus.user_id == user_id,
            )
            .first()
        )
        if not version:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Syllabus version not found or access denied.",
            )

        # Context validation if specified
        if academic_context_id and version.syllabus.academic_context_id:
            if version.syllabus.academic_context_id != academic_context_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Syllabus does not match authorized academic context.",
                )

        # 2. Check for 03R draft or trigger extraction
        draft = (
            db.query(SyllabusCurriculumDraft)
            .filter(
                SyllabusCurriculumDraft.syllabus_version_id == version_id,
                SyllabusCurriculumDraft.user_id == user_id,
            )
            .first()
        )

        if not draft:
            if version.processing_status != "completed":
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Cannot compile draft: Please extract syllabus document structure first.",
                )
            # Check if extraction can be run
            job = SyllabusJobRunner.start_processing_job(
                db=db,
                syllabus_id=syllabus_id,
                version_id=version_id,
                user_id=user_id,
                academic_context_id=academic_context_id,
                force_reprocess=True,
                run_async=False,
            )
            if job.status == "failed":
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail=f"Cannot compile draft: Document extraction failed. {job.error_message or ''}".strip(),
                )

            draft = (
                db.query(SyllabusCurriculumDraft)
                .filter(
                    SyllabusCurriculumDraft.syllabus_version_id == version_id,
                    SyllabusCurriculumDraft.user_id == user_id,
                )
                .first()
            )

            if not draft:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Missing 03R syllabus extraction. Please analyze syllabus document first.",
                )

        # 3. Idempotent compilation check
        current_version = draft.compilation_version or 1
        if not force_recompile and draft.compilation_status == "draft_ready" and draft.compiled_at:
            logger.info(f"[CurriculumCompiler] Draft already compiled at v{current_version}. Returning existing compilation.")
            return cls._build_compilation_result(draft, "Curriculum draft already compiled and up to date.")

        # 4. Perform Canonical Normalization & Compilation
        try:
            draft.compilation_status = "compiling"
            db.flush()

            # Execute normalization on each subject, module, topic, and outcome
            review_required_count = 0
            prerequisites_to_add: List[SyllabusDraftPrerequisite] = []

            # Clear existing prerequisites for clean idempotent re-compile
            db.query(SyllabusDraftPrerequisite).filter(SyllabusDraftPrerequisite.draft_id == draft.id).delete()

            for subject in draft.subjects:
                # Normalize subject fields
                subject.name = cls._normalize_text(subject.name)
                subject.code = cls._normalize_code(subject.code)
                subject.page_start = subject.source_page or 1
                subject.page_end = subject.source_page or 1
                subject.source_section_id = f"sec_subj_{subject.code or '01'}"

                if subject.confidence == "low":
                    subject.review_required = True
                    review_required_count += 1

                seen_topic_titles_in_module: Set[str] = set()

                for mod_idx, module in enumerate(subject.modules):
                    # Normalize module title & preserve original display label
                    norm_label, norm_title = cls._normalize_module_header(module.display_label, module.title)
                    module.original_label = module.original_label or module.display_label or norm_label
                    module.display_label = norm_label
                    module.title = norm_title
                    module.sequence_order = mod_idx + 1
                    module.page_start = module.source_page or 1
                    module.page_end = module.source_page or 1
                    module.source_section_id = f"sec_mod_{mod_idx + 1}"
                    module.sort_order = mod_idx

                    if module.confidence == "low":
                        module.review_required = True
                        review_required_count += 1

                    # Canonical Lesson Candidates Compilation & Deduplication within Unit
                    seen_in_this_unit: Set[str] = set()
                    cleaned_topics: List[SyllabusDraftTopic] = []

                    for t_idx, topic in enumerate(module.topics):
                        cleaned_title = cls._normalize_topic_title(topic.title)

                        # Skip pure noise or repeated header lines
                        if cls._is_noise_or_header(cleaned_title):
                            continue

                        # Intra-unit deduplication
                        norm_key = cleaned_title.lower().strip()
                        if norm_key in seen_in_this_unit:
                            logger.debug(f"[CurriculumCompiler] Pruned duplicate topic in unit: '{cleaned_title}'")
                            continue
                        seen_in_this_unit.add(norm_key)

                        topic.title = cleaned_title
                        topic.is_lesson_candidate = True
                        topic.lesson_candidate_title = cleaned_title
                        topic.source_section_id = f"{module.source_section_id}_top_{t_idx + 1}"
                        topic.page_start = topic.source_page or module.page_start
                        topic.page_end = topic.source_page or module.page_end
                        topic.sort_order = len(cleaned_topics)

                        # Ambiguity detection
                        is_ambiguous, reason = cls._check_ambiguity(cleaned_title, topic.confidence)
                        if is_ambiguous:
                            topic.is_ambiguous = True
                            topic.ambiguity_reason = reason
                            topic.review_required = True
                            review_required_count += 1
                        elif topic.confidence == "low":
                            topic.review_required = True
                            review_required_count += 1

                        # Prerequisite check within topic text
                        if any(kw in cleaned_title.lower() for kw in cls.PREREQUISITE_KEYWORDS):
                            prereq = SyllabusDraftPrerequisite(
                                id=str(uuid.uuid4()),
                                draft_id=draft.id,
                                draft_subject_id=subject.id,
                                source_module_id=module.id,
                                source_topic_id=topic.id,
                                title=f"Prerequisite: {cleaned_title}",
                                description=f"Identified as fundamental prerequisite concept from {module.display_label}",
                                prerequisite_type="explicit",
                                confidence="high",
                                evidence_text=topic.evidence_text or cleaned_title,
                                review_required=False,
                            )
                            prerequisites_to_add.append(prereq)

                        cleaned_topics.append(topic)

                    # Update module topics with clean candidates
                    module.topics = cleaned_topics

                    # Infer sequential prerequisite between sequential modules
                    if mod_idx > 0 and len(subject.modules) > mod_idx:
                        prev_mod = subject.modules[mod_idx - 1]
                        inferred_prereq = SyllabusDraftPrerequisite(
                            id=str(uuid.uuid4()),
                            draft_id=draft.id,
                            draft_subject_id=subject.id,
                            source_module_id=prev_mod.id,
                            target_module_id=module.id,
                            title=f"{prev_mod.display_label} foundational concepts required for {module.display_label}",
                            description=f"Curriculum sequencing: concepts in {module.title} build upon {prev_mod.title}.",
                            prerequisite_type="inferred",
                            confidence="medium",
                            evidence_text=f"Sequential unit flow: {prev_mod.display_label} -> {module.display_label}",
                            review_required=False,
                        )
                        prerequisites_to_add.append(inferred_prereq)

                # Outcomes Normalization & Scoping
                for o_idx, outcome in enumerate(subject.outcomes):
                    outcome.description = cls._normalize_outcome_description(outcome.description)
                    outcome.sort_order = o_idx
                    outcome.source_section_id = f"sec_out_{o_idx + 1}"
                    outcome.page_start = outcome.source_page or subject.page_start
                    outcome.page_end = outcome.source_page or subject.page_start

                    # Determine scope & origin
                    scope, origin = cls._determine_outcome_scope(outcome.description, outcome.outcome_type)
                    outcome.scope_level = scope
                    outcome.origin = origin

                    if outcome.confidence == "low":
                        outcome.review_required = True
                        review_required_count += 1

            # Attach newly compiled prerequisites
            for p in prerequisites_to_add:
                db.add(p)

            # Update draft metadata
            if academic_context_id or (version.syllabus and version.syllabus.academic_context_id):
                draft.academic_context_id = academic_context_id or version.syllabus.academic_context_id
            draft.compilation_status = "compiled"
            draft.compilation_version = current_version + 1
            draft.compilation_error = None
            draft.compiled_at = datetime.utcnow()
            draft.status = "review_required"

            # STRICT INVARIANT: Version curriculum status must be review_required and inactive
            version.curriculum_status = "review_required"
            version.is_active = False

            db.commit()
            db.refresh(draft)

            logger.info(
                f"[CurriculumCompiler] Successfully compiled draft {draft.id} at v{draft.compilation_version}. "
                f"Subjects: {len(draft.subjects)}, Prerequisites: {len(draft.prerequisites)}, "
                f"Review Required: {review_required_count}"
            )

            return cls._build_compilation_result(
                draft,
                "Canonical curriculum draft successfully compiled from syllabus evidence. Review required before activation."
            )

        except Exception as e:
            db.rollback()
            logger.error(f"[CurriculumCompiler] Error compiling draft: {str(e)}", exc_info=True)
            # Re-fetch draft to update failure status
            try:
                failed_draft = (
                    db.query(SyllabusCurriculumDraft)
                    .filter(SyllabusCurriculumDraft.id == draft.id)
                    .first()
                )
                if failed_draft:
                    failed_draft.compilation_status = "failed"
                    failed_draft.compilation_error = str(e)
                    db.commit()
            except Exception:
                db.rollback()

            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Curriculum draft compilation failed: {str(e)}",
            )

    @classmethod
    def _normalize_text(cls, text: str) -> str:
        """Removes duplicate whitespace, cleans stray unicode quotes, trims."""
        if not text:
            return ""
        t = re.sub(r"\s+", " ", text).strip()
        t = t.replace("“", '"').replace("”", '"').replace("’", "'").replace("‘", "'")
        return t

    @classmethod
    def _normalize_code(cls, code: Optional[str]) -> Optional[str]:
        if not code:
            return None
        c = code.upper().strip()
        c = re.sub(r"[^A-Z0-9]", "", c)
        return c

    @classmethod
    def _normalize_module_header(cls, label: str, title: str) -> Tuple[str, str]:
        """Preserves original academic display label (e.g. Unit 1, Module II) while normalizing title."""
        norm_label = cls._normalize_text(label) or "Unit"
        norm_title = cls._normalize_text(title)

        # If title starts with the label (e.g. "Unit 1: Introduction"), strip redundant prefix from title
        prefix_pattern = re.compile(rf"^{re.escape(norm_label)}[\s\:\-\–]*", re.IGNORECASE)
        norm_title = prefix_pattern.sub("", norm_title).strip()

        # If title is empty, retain label as title
        if not norm_title:
            norm_title = norm_label

        return norm_label, norm_title

    @classmethod
    def _normalize_topic_title(cls, topic_title: str) -> str:
        """Cleans bullet points, leading numbering, OCR artifacts without changing meaning."""
        t = cls._normalize_text(topic_title)
        # Strip leading bullet indicators (e.g. "- ", "* ", "1. ", "a) ")
        t = re.sub(r"^([0-9]+|[a-zA-Z])[\.\)\-\–]\s*", "", t)
        t = re.sub(r"^[\-\*\•\–\—\>]\s*", "", t)
        return t.strip()

    @classmethod
    def _normalize_outcome_description(cls, desc: str) -> str:
        """Fixes OCR confusion between 'C01' and 'CO1' and trims."""
        t = cls._normalize_text(desc)
        t = re.sub(r"\bC0(\d+)\b", r"CO\1", t)
        t = re.sub(r"\bL0(\d+)\b", r"LO\1", t)
        return t

    @classmethod
    def _is_noise_or_header(cls, text: str) -> bool:
        """Returns True if text is a page header, page number, or empty noise."""
        if not text or len(text) < 2:
            return True
        for pattern in cls.NOISE_PATTERNS:
            if pattern.match(text):
                return True
        for pattern in cls.REPEATED_HEADER_PATTERNS:
            if pattern.match(text):
                return True
        return False

    @classmethod
    def _check_ambiguity(cls, topic_title: str, confidence: str) -> Tuple[bool, Optional[str]]:
        """Identifies ambiguous or low-confidence topics that need human review."""
        if len(topic_title) < 3:
            return True, "Topic title is too short or fragmented."
        if topic_title.isdigit():
            return True, "Topic consists only of numbers without concept description."
        if confidence.lower() == "low":
            return True, "Low OCR / extraction confidence."
        return False, None

    @classmethod
    def _determine_outcome_scope(cls, desc: str, outcome_type: str) -> Tuple[str, str]:
        """Determines scope (course, subject, module) and origin (explicit, inferred)."""
        lower = desc.lower()
        scope = "course"
        if "unit" in lower or "module" in lower or "chapter" in lower:
            scope = "module"
        origin = "explicit" if any(k in lower for k in ["co", "c0", "lo", "upon completion", "ability to"]) else "inferred"
        return scope, origin

    @classmethod
    def _build_compilation_result(cls, draft: SyllabusCurriculumDraft, message: str) -> SyllabusCompilationResult:
        """Assembles a clean response schema summarizing the compiled curriculum draft."""
        subject_count = len(draft.subjects)
        module_count = sum(len(s.modules) for s in draft.subjects)
        lesson_count = sum(len(m.topics) for s in draft.subjects for m in s.modules)
        outcome_count = sum(len(s.outcomes) for s in draft.subjects)
        prereq_count = len(draft.prerequisites) if draft.prerequisites else 0

        review_required_count = 0
        for s in draft.subjects:
            if s.review_required:
                review_required_count += 1
            for m in s.modules:
                if m.review_required:
                    review_required_count += 1
                for t in m.topics:
                    if t.review_required or t.is_ambiguous:
                        review_required_count += 1
            for o in s.outcomes:
                if o.review_required:
                    review_required_count += 1

        return SyllabusCompilationResult(
            draft_id=draft.id,
            syllabus_version_id=draft.syllabus_version_id,
            compilation_status=draft.compilation_status or "draft_ready",
            compilation_version=draft.compilation_version or 1,
            subject_count=subject_count,
            module_count=module_count,
            lesson_candidate_count=lesson_count,
            outcome_count=outcome_count,
            prerequisite_count=prereq_count,
            review_required_count=review_required_count,
            is_curriculum_active=False,
            message=message,
        )
