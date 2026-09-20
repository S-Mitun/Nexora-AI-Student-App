-- ==============================================================================
-- NEXORA MIGRATION 20260918030000
-- Stage 06 Pre-Check Correction Patch:
-- 1. Curriculum Decoupling & Multi-Board Architecture
-- 2. Enhanced Document Material Ownership & Async Ingestion Pipeline Support
-- ==============================================================================

-- 1. Create curricula table (Decouples curriculum from fixed engineering/CSE bias)
CREATE TABLE IF NOT EXISTS public.curricula (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(150) NOT NULL,
    board_authority VARCHAR(150) NOT NULL,
    education_level VARCHAR(50) NOT NULL DEFAULT 'class-6-10', -- class-1-5, class-6-10, class-11-12, undergraduate, postgraduate, research, custom
    country VARCHAR(50) DEFAULT 'India',
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_curricula_education_level ON public.curricula(education_level);
CREATE INDEX IF NOT EXISTS idx_curricula_code ON public.curricula(code);

-- Enable RLS for curricula (Public readable for all students)
ALTER TABLE public.curricula ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read for curricula" ON public.curricula
    FOR SELECT USING (true);

-- 2. Seed Standard Starter Curricula across all Education Levels
INSERT INTO public.curricula (id, code, name, board_authority, education_level, country, description, is_active)
VALUES
    ('cur-00000000-0000-0000-0000-000000000001', 'cbse-primary', 'CBSE Primary (Classes 1–5)', 'Central Board of Secondary Education', 'class-1-5', 'India', 'Foundational literacy, numeracy, environmental studies, and basic sciences.', TRUE),
    ('cur-00000000-0000-0000-0000-000000000002', 'cbse-secondary', 'CBSE Secondary (Classes 6–10)', 'Central Board of Secondary Education', 'class-6-10', 'India', 'Standard secondary curriculum covering General Science, Mathematics, and Social Science.', TRUE),
    ('cur-00000000-0000-0000-0000-000000000003', 'cbse-higher-sec', 'CBSE Higher Secondary (Classes 11–12)', 'Central Board of Secondary Education', 'class-11-12', 'India', 'Specialized streams: Physics, Chemistry, Mathematics, Biology, Computer Science, and Commerce.', TRUE),
    ('cur-00000000-0000-0000-0000-000000000004', 'icse-secondary', 'ICSE Secondary (Classes 6–10)', 'Council for the Indian School Certificate Examinations', 'class-6-10', 'India', 'Comprehensive science, mathematics, and humanities curriculum.', TRUE),
    ('cur-00000000-0000-0000-0000-000000000005', 'tn-state-board', 'Tamil Nadu State Board (Classes 6–10)', 'Tamil Nadu State Board of School Examination', 'class-6-10', 'India', 'State board bilingual science, mathematics, and social studies curriculum.', TRUE),
    ('cur-00000000-0000-0000-0000-000000000006', 'univ-eng-cse', 'University Engineering (Computer Science & IT)', 'Autonomous & Affiliated Engineering Colleges', 'undergraduate', 'India', 'Undergraduate engineering core: algorithms, operating systems, databases, and networks.', TRUE),
    ('cur-00000000-0000-0000-0000-000000000007', 'univ-sciences', 'University Natural Sciences (B.Sc)', 'Collegiate & Central Universities', 'undergraduate', 'India', 'Undergraduate physics, chemistry, biology, and applied mathematics.', TRUE),
    ('cur-00000000-0000-0000-0000-000000000008', 'postgrad-advanced', 'Postgraduate & Research Sciences', 'Research Institutes & Universities', 'research', 'India', 'Advanced graduate research, machine learning, quantum physics, and experimental labs.', TRUE),
    ('cur-00000000-0000-0000-0000-000000000009', 'custom-independent', 'Independent & Self-Directed Study', 'Independent Learner', 'custom', 'Global', 'Student-curated academic study driven directly by uploaded textbooks and papers.', TRUE)
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    board_authority = EXCLUDED.board_authority,
    education_level = EXCLUDED.education_level,
    description = EXCLUDED.description;

-- 3. Enhance subjects table to link with curricula
ALTER TABLE public.subjects
    ADD COLUMN IF NOT EXISTS curriculum_id UUID REFERENCES public.curricula(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_subjects_curriculum_id ON public.subjects(curriculum_id);

-- Associate existing starter engineering subjects with univ-eng-cse curriculum
UPDATE public.subjects
SET curriculum_id = 'cur-00000000-0000-0000-0000-000000000006'
WHERE slug IN ('data-structures-algorithms', 'operating-systems', 'database-management-systems', 'computer-networks', 'artificial-intelligence-machine-learning')
  AND curriculum_id IS NULL;

-- Associate existing physics subject with univ-sciences curriculum
UPDATE public.subjects
SET curriculum_id = 'cur-00000000-0000-0000-0000-000000000007'
WHERE slug = 'physics'
  AND curriculum_id IS NULL;

-- 4. Enhance profiles table with curriculum and grade level
ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS curriculum_id UUID REFERENCES public.curricula(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS grade_level VARCHAR(50) DEFAULT 'Class 10',
    ADD COLUMN IF NOT EXISTS academic_domain VARCHAR(100) DEFAULT 'General Studies';

CREATE INDEX IF NOT EXISTS idx_profiles_curriculum_id ON public.profiles(curriculum_id);

-- 5. Enhance documents table for Asynchronous Ingestion & Provenance
ALTER TABLE public.documents
    ADD COLUMN IF NOT EXISTS curriculum_id UUID REFERENCES public.curricula(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS language VARCHAR(10) DEFAULT 'en',
    ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1,
    ADD COLUMN IF NOT EXISTS progress_percent INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS processing_stage VARCHAR(50) DEFAULT 'queued',
    ADD COLUMN IF NOT EXISTS error_message TEXT,
    ADD COLUMN IF NOT EXISTS page_count INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS content_hash VARCHAR(64);

CREATE INDEX IF NOT EXISTS idx_documents_curriculum_id ON public.documents(curriculum_id);
CREATE INDEX IF NOT EXISTS idx_documents_subject_id ON public.documents(subject_id);
CREATE INDEX IF NOT EXISTS idx_documents_processing_stage ON public.documents(processing_stage);

-- 6. Add explicit page_number to document_chunks
ALTER TABLE public.document_chunks
    ADD COLUMN IF NOT EXISTS page_number INTEGER DEFAULT 1;
