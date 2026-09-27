import os
import sys
from pathlib import Path

# Add backend dir
backend_dir = Path("backend").resolve()
sys.path.insert(0, str(backend_dir))

from app.db.session import SessionLocal, engine
from app.db.base import Base
from sqlalchemy import text
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
from app.models.learning import Subject, LearningModule, Lesson, PracticeSet
from app.services.syllabus.compiler_engine import SyllabusCurriculumCompilerEngine

def sync_schema():
    Base.metadata.create_all(bind=engine)
    with engine.connect() as conn:
        # Check syllabus_curriculum_drafts columns
        cols = {row[1] for row in conn.execute(text("PRAGMA table_info(syllabus_curriculum_drafts)"))}
        if cols:
            if "compilation_status" not in cols:
                conn.execute(text("ALTER TABLE syllabus_curriculum_drafts ADD COLUMN compilation_status VARCHAR(50) DEFAULT 'draft_ready'"))
            if "compilation_version" not in cols:
                conn.execute(text("ALTER TABLE syllabus_curriculum_drafts ADD COLUMN compilation_version INTEGER DEFAULT 1"))
            if "compilation_error" not in cols:
                conn.execute(text("ALTER TABLE syllabus_curriculum_drafts ADD COLUMN compilation_error TEXT"))
            if "compiled_at" not in cols:
                conn.execute(text("ALTER TABLE syllabus_curriculum_drafts ADD COLUMN compiled_at DATETIME"))
            conn.commit()
        # Check syllabus_draft_modules columns
        m_cols = {row[1] for row in conn.execute(text("PRAGMA table_info(syllabus_draft_modules)"))}
        if m_cols:
            if "original_label" not in m_cols:
                conn.execute(text("ALTER TABLE syllabus_draft_modules ADD COLUMN original_label VARCHAR(100)"))
            if "sequence_order" not in m_cols:
                conn.execute(text("ALTER TABLE syllabus_draft_modules ADD COLUMN sequence_order INTEGER"))
            conn.commit()
        # Check syllabus_draft_topics columns
        t_cols = {row[1] for row in conn.execute(text("PRAGMA table_info(syllabus_draft_topics)"))}
        if t_cols:
            if "is_lesson_candidate" not in t_cols:
                conn.execute(text("ALTER TABLE syllabus_draft_topics ADD COLUMN is_lesson_candidate BOOLEAN DEFAULT 1"))
            if "lesson_candidate_title" not in t_cols:
                conn.execute(text("ALTER TABLE syllabus_draft_topics ADD COLUMN lesson_candidate_title VARCHAR(255)"))
            if "ambiguity_reason" not in t_cols:
                conn.execute(text("ALTER TABLE syllabus_draft_topics ADD COLUMN ambiguity_reason VARCHAR(512)"))
            conn.commit()
        # Check syllabus_draft_outcomes columns
        o_cols = {row[1] for row in conn.execute(text("PRAGMA table_info(syllabus_draft_outcomes)"))}
        if o_cols:
            if "scope_level" not in o_cols:
                conn.execute(text("ALTER TABLE syllabus_draft_outcomes ADD COLUMN scope_level VARCHAR(50) DEFAULT 'course'"))
            if "origin" not in o_cols:
                conn.execute(text("ALTER TABLE syllabus_draft_outcomes ADD COLUMN origin VARCHAR(50) DEFAULT 'explicit'"))
            conn.commit()

def verify_live_database():
    sync_schema()
    db = SessionLocal()
    try:
        user_id = "d52061f5-0fc1-497f-bbba-7142519eab0d"
        syl_id = "75af4ac9-7bab-46c8-b66c-f01ca4a8821f"
        ver_id = "91e47350-e025-41b7-a634-ccc6416edcc2"

        print("============================================================")
        print("04R LIVE DATABASE INTEGRATION AND COMPILATION VERIFICATION")
        print("============================================================")

        # 1. Fetch Version
        ver = db.query(SyllabusVersion).filter(SyllabusVersion.id == ver_id).first()
        if not ver:
            # Fallback to finding user's syllabus version by file
            ver = (
                db.query(SyllabusVersion)
                .join(Syllabus, Syllabus.id == SyllabusVersion.syllabus_id)
                .filter(Syllabus.user_id == user_id)
                .first()
            )
            if ver:
                ver_id = ver.id
                syl_id = ver.syllabus_id
            else:
                print(f"Error: No syllabus version found for user {user_id} in live database.")
                return

        print(f"Syllabus Version Found: {ver.source_filename} (v{ver.version_number}) [ID: {ver.id}]")
        print(f"Current Curriculum Status: {ver.curriculum_status}, Active: {ver.is_active}")

        # 2. Compile via CompilerEngine
        engine = SyllabusCurriculumCompilerEngine(db=db)
        result = engine.compile_version(
            syllabus_id=syl_id,
            version_id=ver_id,
            user_id=user_id,
            academic_context_id=ver.syllabus.academic_context_id if ver.syllabus else None,
        )

        print("\n--- COMPILATION RESULT ---")
        print(f"Compilation Status: {result.compilation_status}")
        print(f"Compilation Version: v{result.compilation_version}")
        print(f"Subjects Count: {result.subject_count}")
        print(f"Modules Count: {result.module_count}")
        print(f"Lesson Candidates Count: {result.lesson_candidate_count}")
        print(f"Outcomes Count: {result.outcome_count}")
        print(f"Prerequisites Count: {result.prerequisite_count}")
        print(f"Review Required Count: {result.review_required_count}")
        print(f"Curriculum Active: {result.is_curriculum_active}")

        # 3. Verify Database Records
        draft = db.query(SyllabusCurriculumDraft).filter(
            SyllabusCurriculumDraft.syllabus_version_id == ver_id,
        ).first()

        assert draft is not None, "Draft must exist in syllabus_curriculum_drafts"
        assert draft.compilation_status == "compiled"
        assert draft.status == "review_required"

        db.refresh(ver)
        assert ver.is_active is False, "STRICT INVARIANT: is_active must remain False"
        assert ver.curriculum_status == "review_required", "curriculum_status must remain review_required"

        print("\n--- DATABASE HIERARCHY VERIFICATION ---")
        print(f"Table: syllabus_curriculum_drafts [ID: {draft.id}]")
        print(f"  Owner: {draft.user_id}, Context: {draft.academic_context_id}")
        print(f"  Compilation Status: {draft.compilation_status}, Version: v{draft.compilation_version}")

        # Subjects
        print(f"\nTable: syllabus_draft_subjects ({len(draft.subjects)} records)")
        for s in draft.subjects:
            print(f"  Subject: [{s.code}] {s.name} ({s.credits}, {s.semester}) - Confidence: {s.confidence}")
            print(f"    Citation: Page {s.source_page} | Section: {s.source_section_id}")

            # Modules
            print(f"\n  Table: syllabus_draft_modules ({len(s.modules)} records)")
            for m in s.modules:
                candidate_count = len(m.topics)
                print(f"    Module: {m.original_label or m.display_label} - '{m.title}' (Seq #{m.sequence_order})")
                print(f"      Citation: Page {m.source_page} | Candidates: {candidate_count} | Confidence: {m.confidence}")

            # Outcomes
            print(f"\n  Table: syllabus_draft_outcomes ({len(s.outcomes)} records)")
            for o in s.outcomes:
                print(f"    Outcome: [{o.outcome_type}] {o.description[:70]}... | Scope: {o.scope_level} | Origin: {o.origin}")

        # Prerequisites
        prereqs = db.query(SyllabusDraftPrerequisite).filter(
            SyllabusDraftPrerequisite.draft_id == draft.id,
        ).all()
        print(f"\nTable: syllabus_draft_prerequisites ({len(prereqs)} records)")
        for p in prereqs:
            print(f"  Prerequisite: [{p.prerequisite_type.upper()}] {p.title} - Confidence: {p.confidence}")

        # Check Runtime Isolation
        runtime_subjects = db.query(Subject).filter(Subject.syllabus_version_id == ver_id).count()
        runtime_modules = db.query(LearningModule).filter(LearningModule.content_source == "syllabus_extracted").count()
        runtime_lessons = db.query(Lesson).filter(Lesson.content_source == "syllabus_extracted").count()

        print("\n--- RUNTIME ISOLATION AUDIT ---")
        print(f"Runtime subjects tied to this syllabus version: {runtime_subjects} (Expected: 0)")
        print(f"Runtime modules from 04R draft: {runtime_modules} (Expected: 0)")
        print(f"Runtime lessons from 04R draft: {runtime_lessons} (Expected: 0)")

        assert runtime_subjects == 0, "No runtime subjects may be created in 04R!"
        assert runtime_modules == 0, "No runtime modules may be created in 04R!"
        assert runtime_lessons == 0, "No runtime lessons may be created in 04R!"

        print("\nSUCCESS: All 04R Database Invariants and Entities Verified Cleanly.")
        print("============================================================")

    finally:
        db.close()

if __name__ == "__main__":
    verify_live_database()
