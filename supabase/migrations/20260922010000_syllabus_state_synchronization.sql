-- ==============================================================================
-- NEXORA SUPABASE MIGRATION: Syllabus State Synchronization
-- Adds explicit upload, processing, and curriculum status columns to syllabus_versions
-- ==============================================================================

-- 1. Add status columns to syllabus_versions
ALTER TABLE public.syllabus_versions
    ADD COLUMN IF NOT EXISTS upload_status VARCHAR(50) DEFAULT 'uploaded',
    ADD COLUMN IF NOT EXISTS processing_status VARCHAR(50) DEFAULT 'not_started',
    ADD COLUMN IF NOT EXISTS curriculum_status VARCHAR(50) DEFAULT 'not_built';

-- 2. Indexes for state query performance
CREATE INDEX IF NOT EXISTS idx_syllabus_versions_curriculum_status 
    ON public.syllabus_versions(curriculum_status);

CREATE INDEX IF NOT EXISTS idx_syllabus_versions_upload_status 
    ON public.syllabus_versions(upload_status);

-- 3. Backfill existing records
UPDATE public.syllabus_versions
SET 
    curriculum_status = CASE 
        WHEN is_active = TRUE THEN 'active'
        WHEN status = 'archived' THEN 'archived'
        ELSE 'not_built'
    END,
    upload_status = CASE 
        WHEN status = 'failed' THEN 'failed'
        ELSE 'verified'
    END,
    processing_status = CASE 
        WHEN is_active = TRUE THEN 'completed'
        WHEN status = 'failed' THEN 'failed'
        ELSE 'not_started'
    END
WHERE curriculum_status IS NULL OR upload_status IS NULL OR processing_status IS NULL;

-- 4. Correct any legacy document records with premature intelligence stage
UPDATE public.documents
SET 
    processing_stage = 'uploaded',
    progress_percent = 100
WHERE document_role = 'syllabus' 
  AND processing_stage = 'ready_for_curriculum_intelligence';
