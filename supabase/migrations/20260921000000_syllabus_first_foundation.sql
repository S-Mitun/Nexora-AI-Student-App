-- Migration: 20260921000000_syllabus_first_foundation.sql
-- Master Prompt 01R: Syllabus-First Architectural Foundation & Legacy Content Migration
-- Establishes syllabi, syllabus_versions, document role classification, and user-scoped curriculum hierarchy.

-- 1. Create syllabi table
CREATE TABLE IF NOT EXISTS public.syllabi (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    academic_level VARCHAR(50) NOT NULL,
    institution VARCHAR(255),
    program_degree VARCHAR(255),
    academic_year VARCHAR(50),
    title VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'uploaded', -- uploaded, processing, extracted, confirmed, archived
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_syllabi_user_level ON public.syllabi (user_id, academic_level);
CREATE INDEX IF NOT EXISTS ix_syllabi_status ON public.syllabi (status);

-- 2. Create syllabus_versions table
CREATE TABLE IF NOT EXISTS public.syllabus_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    syllabus_id UUID NOT NULL REFERENCES public.syllabi(id) ON DELETE CASCADE,
    version_number INT NOT NULL DEFAULT 1,
    document_id UUID REFERENCES public.documents(id) ON DELETE SET NULL,
    raw_extracted_json JSONB,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    activated_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_syllabus_versions_syllabus ON public.syllabus_versions (syllabus_id);
CREATE INDEX IF NOT EXISTS ix_syllabus_versions_active ON public.syllabus_versions (syllabus_id, is_active);

-- 3. Enhance documents table with role classification and syllabus link
ALTER TABLE public.documents 
ADD COLUMN IF NOT EXISTS document_role VARCHAR(50) DEFAULT 'secondary_material' NOT NULL;

ALTER TABLE public.documents 
ADD COLUMN IF NOT EXISTS syllabus_id UUID REFERENCES public.syllabi(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS ix_documents_role ON public.documents (document_role);
CREATE INDEX IF NOT EXISTS ix_documents_syllabus ON public.documents (syllabus_id);

-- 4. Enhance curriculum hierarchy with syllabus version link on Subject (root curriculum anchor)
ALTER TABLE public.subjects
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS syllabus_version_id UUID REFERENCES public.syllabus_versions(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS content_source VARCHAR(50) DEFAULT 'syllabus_extracted';

CREATE INDEX IF NOT EXISTS ix_subjects_user_syllabus ON public.subjects (user_id, syllabus_version_id);

ALTER TABLE public.topics
ADD COLUMN IF NOT EXISTS content_source VARCHAR(50) DEFAULT 'syllabus_extracted';

ALTER TABLE public.concepts
ADD COLUMN IF NOT EXISTS content_source VARCHAR(50) DEFAULT 'syllabus_extracted';

ALTER TABLE public.learning_modules
ADD COLUMN IF NOT EXISTS content_source VARCHAR(50) DEFAULT 'syllabus_extracted';

ALTER TABLE public.lessons
ADD COLUMN IF NOT EXISTS content_source VARCHAR(50) DEFAULT 'syllabus_extracted';

-- 5. Mark legacy prebuilt subjects as system reference templates (is_system = True, user_id = NULL)
UPDATE public.subjects
SET is_system = TRUE, content_source = 'system_reference'
WHERE user_id IS NULL AND is_system IS NOT TRUE;

-- 6. Enable Row Level Security (RLS) on new tables
ALTER TABLE public.syllabi ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.syllabus_versions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own syllabi" ON public.syllabi;
CREATE POLICY "Users can read own syllabi"
ON public.syllabi FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own syllabi" ON public.syllabi;
CREATE POLICY "Users can insert own syllabi"
ON public.syllabi FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own syllabi" ON public.syllabi;
CREATE POLICY "Users can update own syllabi"
ON public.syllabi FOR UPDATE
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own syllabi" ON public.syllabi;
CREATE POLICY "Users can delete own syllabi"
ON public.syllabi FOR DELETE
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can read own syllabus versions" ON public.syllabus_versions;
CREATE POLICY "Users can read own syllabus versions"
ON public.syllabus_versions FOR SELECT
USING (EXISTS (
    SELECT 1 FROM public.syllabi s
    WHERE s.id = syllabus_versions.syllabus_id AND s.user_id = auth.uid()
));

DROP POLICY IF EXISTS "Users can manage own syllabus versions" ON public.syllabus_versions;
CREATE POLICY "Users can manage own syllabus versions"
ON public.syllabus_versions FOR ALL
USING (EXISTS (
    SELECT 1 FROM public.syllabi s
    WHERE s.id = syllabus_versions.syllabus_id AND s.user_id = auth.uid()
));
