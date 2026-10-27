-- ============================================================
-- Migration: 20260922020000_syllabus_curriculum_draft.sql
-- Master Prompt 03R: Syllabus Document Understanding, Extraction,
-- Structured Curriculum Draft, Evidence & Confidence Persistence
-- ============================================================

-- 1. Syllabus Processing Jobs
CREATE TABLE IF NOT EXISTS public.syllabus_processing_jobs (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    syllabus_version_id VARCHAR(36) NOT NULL REFERENCES public.syllabus_versions(id) ON DELETE CASCADE,
    user_id VARCHAR(36) NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    academic_context_id VARCHAR(255),
    status VARCHAR(50) NOT NULL DEFAULT 'queued', -- queued, extracting, analyzing, completed, failed
    stage VARCHAR(100) NOT NULL DEFAULT 'queued',
    error_message TEXT,
    progress_percent INT DEFAULT 0,
    total_pages INT DEFAULT 0,
    processed_pages INT DEFAULT 0,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_syllabus_processing_jobs_version 
    ON public.syllabus_processing_jobs (syllabus_version_id, status);

CREATE INDEX IF NOT EXISTS idx_syllabus_processing_jobs_user 
    ON public.syllabus_processing_jobs (user_id);

-- 2. Syllabus Curriculum Drafts (Draft Root Anchor)
CREATE TABLE IF NOT EXISTS public.syllabus_curriculum_drafts (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    syllabus_version_id VARCHAR(36) NOT NULL UNIQUE REFERENCES public.syllabus_versions(id) ON DELETE CASCADE,
    syllabus_id VARCHAR(36) NOT NULL REFERENCES public.syllabi(id) ON DELETE CASCADE,
    user_id VARCHAR(36) NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    academic_context_id VARCHAR(255),
    title VARCHAR(255) NOT NULL,
    academic_level VARCHAR(50) NOT NULL,
    institution VARCHAR(255),
    raw_text_summary TEXT,
    overall_confidence VARCHAR(50) DEFAULT 'medium', -- high, medium, low
    status VARCHAR(50) NOT NULL DEFAULT 'review_required', -- draft, review_required, approved, rejected
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_syllabus_curriculum_drafts_version 
    ON public.syllabus_curriculum_drafts (syllabus_version_id);

CREATE INDEX IF NOT EXISTS idx_syllabus_curriculum_drafts_user 
    ON public.syllabus_curriculum_drafts (user_id, academic_context_id);

-- 3. Syllabus Draft Subjects
CREATE TABLE IF NOT EXISTS public.syllabus_draft_subjects (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    draft_id VARCHAR(36) NOT NULL REFERENCES public.syllabus_curriculum_drafts(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50),
    credits VARCHAR(50),
    semester VARCHAR(50),
    source_page INT,
    evidence_text TEXT,
    confidence VARCHAR(50) DEFAULT 'high', -- high, medium, low
    sort_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_syllabus_draft_subjects_draft 
    ON public.syllabus_draft_subjects (draft_id, sort_order);

-- 4. Syllabus Draft Modules / Units
CREATE TABLE IF NOT EXISTS public.syllabus_draft_modules (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    draft_subject_id VARCHAR(36) NOT NULL REFERENCES public.syllabus_draft_subjects(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    display_label VARCHAR(100) DEFAULT 'Unit', -- Preserves source terminology: 'Unit I', 'Module 1', 'Chapter 2'
    source_page INT,
    evidence_text TEXT,
    confidence VARCHAR(50) DEFAULT 'high',
    sort_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_syllabus_draft_modules_subject 
    ON public.syllabus_draft_modules (draft_subject_id, sort_order);

-- 5. Syllabus Draft Topics
CREATE TABLE IF NOT EXISTS public.syllabus_draft_topics (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    draft_module_id VARCHAR(36) NOT NULL REFERENCES public.syllabus_draft_modules(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    source_page INT,
    evidence_text TEXT,
    confidence VARCHAR(50) DEFAULT 'high',
    sort_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_syllabus_draft_topics_module 
    ON public.syllabus_draft_topics (draft_module_id, sort_order);

-- 6. Syllabus Draft Outcomes
CREATE TABLE IF NOT EXISTS public.syllabus_draft_outcomes (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    draft_subject_id VARCHAR(36) NOT NULL REFERENCES public.syllabus_draft_subjects(id) ON DELETE CASCADE,
    outcome_type VARCHAR(50) DEFAULT 'course_outcome', -- course_outcome, learning_outcome, objective
    description TEXT NOT NULL,
    source_page INT,
    evidence_text TEXT,
    confidence VARCHAR(50) DEFAULT 'high',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_syllabus_draft_outcomes_subject 
    ON public.syllabus_draft_outcomes (draft_subject_id);

-- 7. Enable Row Level Security (RLS) on all user-linked tables
ALTER TABLE public.syllabus_processing_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.syllabus_curriculum_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.syllabus_draft_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.syllabus_draft_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.syllabus_draft_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.syllabus_draft_outcomes ENABLE ROW LEVEL SECURITY;

-- 8. RLS Policies for authenticated user isolation
CREATE POLICY syllabus_jobs_user_isolation ON public.syllabus_processing_jobs
    FOR ALL USING (auth.uid()::text = user_id);

CREATE POLICY syllabus_drafts_user_isolation ON public.syllabus_curriculum_drafts
    FOR ALL USING (auth.uid()::text = user_id);

CREATE POLICY syllabus_draft_subjects_isolation ON public.syllabus_draft_subjects
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.syllabus_curriculum_drafts d
            WHERE d.id = draft_id AND d.user_id = auth.uid()::text
        )
    );

CREATE POLICY syllabus_draft_modules_isolation ON public.syllabus_draft_modules
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.syllabus_draft_subjects s
            JOIN public.syllabus_curriculum_drafts d ON d.id = s.draft_id
            WHERE s.id = draft_subject_id AND d.user_id = auth.uid()::text
        )
    );

CREATE POLICY syllabus_draft_topics_isolation ON public.syllabus_draft_topics
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.syllabus_draft_modules m
            JOIN public.syllabus_draft_subjects s ON s.id = m.draft_subject_id
            JOIN public.syllabus_curriculum_drafts d ON d.id = s.draft_id
            WHERE m.id = draft_module_id AND d.user_id = auth.uid()::text
        )
    );

CREATE POLICY syllabus_draft_outcomes_isolation ON public.syllabus_draft_outcomes
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.syllabus_draft_subjects s
            JOIN public.syllabus_curriculum_drafts d ON d.id = s.draft_id
            WHERE s.id = draft_subject_id AND d.user_id = auth.uid()::text
        )
    );
