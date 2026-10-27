-- Migration: 20260922000000_syllabus_upload_and_lifecycle.sql
-- Master Prompt 02R: Universal Syllabus Upload & Academic Document Lifecycle Foundation

-- 1. Enhance public.syllabi with academic_context_id
ALTER TABLE public.syllabi
ADD COLUMN IF NOT EXISTS academic_context_id VARCHAR(255);

CREATE INDEX IF NOT EXISTS ix_syllabi_user_context ON public.syllabi (user_id, academic_context_id);

-- 2. Enhance public.syllabus_versions with version lifecycle metadata
ALTER TABLE public.syllabus_versions
ADD COLUMN IF NOT EXISTS status VARCHAR(50) NOT NULL DEFAULT 'uploaded',
ADD COLUMN IF NOT EXISTS source_filename VARCHAR(255),
ADD COLUMN IF NOT EXISTS file_size_bytes INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS mime_type VARCHAR(100),
ADD COLUMN IF NOT EXISTS checksum VARCHAR(64),
ADD COLUMN IF NOT EXISTS storage_path VARCHAR(1024),
ADD COLUMN IF NOT EXISTS error_message TEXT;

CREATE INDEX IF NOT EXISTS ix_syllabus_versions_status ON public.syllabus_versions (status);
CREATE INDEX IF NOT EXISTS ix_syllabus_versions_checksum ON public.syllabus_versions (syllabus_id, checksum);

-- 3. Enhance public.documents with syllabus_version_id and academic_context_id
ALTER TABLE public.documents
ADD COLUMN IF NOT EXISTS syllabus_version_id UUID REFERENCES public.syllabus_versions(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS academic_context_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS mime_type VARCHAR(100);

CREATE INDEX IF NOT EXISTS ix_documents_syllabus_version ON public.documents (syllabus_version_id);
CREATE INDEX IF NOT EXISTS ix_documents_academic_context ON public.documents (academic_context_id);

-- 4. Secure RLS policies for syllabus_versions storage access
DROP POLICY IF EXISTS "Users can read own syllabus versions" ON public.syllabus_versions;
CREATE POLICY "Users can read own syllabus versions"
ON public.syllabus_versions FOR SELECT
USING (EXISTS (
    SELECT 1 FROM public.syllabi
    WHERE public.syllabi.id = public.syllabus_versions.syllabus_id
    AND public.syllabi.user_id = auth.uid()
));

DROP POLICY IF EXISTS "Users can insert own syllabus versions" ON public.syllabus_versions;
CREATE POLICY "Users can insert own syllabus versions"
ON public.syllabus_versions FOR INSERT
WITH CHECK (EXISTS (
    SELECT 1 FROM public.syllabi
    WHERE public.syllabi.id = public.syllabus_versions.syllabus_id
    AND public.syllabi.user_id = auth.uid()
));

DROP POLICY IF EXISTS "Users can update own syllabus versions" ON public.syllabus_versions;
CREATE POLICY "Users can update own syllabus versions"
ON public.syllabus_versions FOR UPDATE
USING (EXISTS (
    SELECT 1 FROM public.syllabi
    WHERE public.syllabi.id = public.syllabus_versions.syllabus_id
    AND public.syllabi.user_id = auth.uid()
));

DROP POLICY IF EXISTS "Users can delete own syllabus versions" ON public.syllabus_versions;
CREATE POLICY "Users can delete own syllabus versions"
ON public.syllabus_versions FOR DELETE
USING (EXISTS (
    SELECT 1 FROM public.syllabi
    WHERE public.syllabi.id = public.syllabus_versions.syllabus_id
    AND public.syllabi.user_id = auth.uid()
));
