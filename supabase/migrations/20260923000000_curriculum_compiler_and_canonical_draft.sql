-- ============================================================
-- Migration: 20260923000000_curriculum_compiler_and_canonical_draft.sql
-- Master Prompt 04R: Syllabus Curriculum Compiler, Canonical Draft Hierarchy,
-- Evidence-Preserving Normalization, Lesson Candidates & Prerequisites
-- ============================================================

-- 1. Enhance Syllabus Curriculum Drafts with Compilation Tracking
ALTER TABLE public.syllabus_curriculum_drafts
    ADD COLUMN IF NOT EXISTS compilation_status VARCHAR(50) DEFAULT 'draft_ready',
    ADD COLUMN IF NOT EXISTS compilation_version INT DEFAULT 1,
    ADD COLUMN IF NOT EXISTS compilation_error TEXT,
    ADD COLUMN IF NOT EXISTS compiled_at TIMESTAMPTZ;

-- 2. Enhance Syllabus Draft Subjects with Section & Review Flags
ALTER TABLE public.syllabus_draft_subjects
    ADD COLUMN IF NOT EXISTS source_section_id VARCHAR(100),
    ADD COLUMN IF NOT EXISTS page_start INT,
    ADD COLUMN IF NOT EXISTS page_end INT,
    ADD COLUMN IF NOT EXISTS review_required BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS is_ambiguous BOOLEAN DEFAULT FALSE;

-- 3. Enhance Syllabus Draft Modules with Section & Review Flags
ALTER TABLE public.syllabus_draft_modules
    ADD COLUMN IF NOT EXISTS source_section_id VARCHAR(100),
    ADD COLUMN IF NOT EXISTS page_start INT,
    ADD COLUMN IF NOT EXISTS page_end INT,
    ADD COLUMN IF NOT EXISTS review_required BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS is_ambiguous BOOLEAN DEFAULT FALSE;

-- 4. Enhance Syllabus Draft Topics (Canonical Lesson Candidates)
ALTER TABLE public.syllabus_draft_topics
    ADD COLUMN IF NOT EXISTS is_lesson_candidate BOOLEAN DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS lesson_candidate_title VARCHAR(255),
    ADD COLUMN IF NOT EXISTS source_section_id VARCHAR(100),
    ADD COLUMN IF NOT EXISTS page_start INT,
    ADD COLUMN IF NOT EXISTS page_end INT,
    ADD COLUMN IF NOT EXISTS review_required BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS is_ambiguous BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS ambiguity_reason TEXT;

-- 5. Enhance Syllabus Draft Outcomes with Scope, Origin & Module Linking
ALTER TABLE public.syllabus_draft_outcomes
    ADD COLUMN IF NOT EXISTS scope_level VARCHAR(50) DEFAULT 'course', -- course, subject, module, lesson
    ADD COLUMN IF NOT EXISTS origin VARCHAR(50) DEFAULT 'explicit', -- explicit, inferred
    ADD COLUMN IF NOT EXISTS draft_module_id VARCHAR(36) REFERENCES public.syllabus_draft_modules(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS source_section_id VARCHAR(100),
    ADD COLUMN IF NOT EXISTS page_start INT,
    ADD COLUMN IF NOT EXISTS page_end INT,
    ADD COLUMN IF NOT EXISTS review_required BOOLEAN DEFAULT FALSE;

-- 6. Create Syllabus Draft Prerequisites
CREATE TABLE IF NOT EXISTS public.syllabus_draft_prerequisites (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    draft_id VARCHAR(36) NOT NULL REFERENCES public.syllabus_curriculum_drafts(id) ON DELETE CASCADE,
    draft_subject_id VARCHAR(36) NOT NULL REFERENCES public.syllabus_draft_subjects(id) ON DELETE CASCADE,
    source_module_id VARCHAR(36) REFERENCES public.syllabus_draft_modules(id) ON DELETE SET NULL,
    target_module_id VARCHAR(36) REFERENCES public.syllabus_draft_modules(id) ON DELETE SET NULL,
    source_topic_id VARCHAR(36) REFERENCES public.syllabus_draft_topics(id) ON DELETE SET NULL,
    target_topic_id VARCHAR(36) REFERENCES public.syllabus_draft_topics(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    prerequisite_type VARCHAR(50) DEFAULT 'explicit', -- explicit, inferred
    confidence VARCHAR(50) DEFAULT 'medium',
    evidence_text TEXT,
    review_required BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_syllabus_draft_prerequisites_draft
    ON public.syllabus_draft_prerequisites (draft_id);

CREATE INDEX IF NOT EXISTS idx_syllabus_draft_prerequisites_subject
    ON public.syllabus_draft_prerequisites (draft_subject_id);

-- 7. Enable RLS on prerequisites
ALTER TABLE public.syllabus_draft_prerequisites ENABLE ROW LEVEL SECURITY;

CREATE POLICY syllabus_draft_prerequisites_isolation ON public.syllabus_draft_prerequisites
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.syllabus_curriculum_drafts d
            WHERE d.id = draft_id AND d.user_id = auth.uid()::text
        )
    );
