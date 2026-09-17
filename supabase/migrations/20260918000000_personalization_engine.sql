-- ==============================================================================
-- NEXORA - PostgreSQL / Supabase Migration
-- Master Prompt 04: Interest & Hobby Personalization Engine
-- ==============================================================================

-- 1. Extend profiles table with dedicated personalization and preference fields
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS favorite_subjects JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS preferred_learning_style VARCHAR(50) DEFAULT 'visual';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS custom_interests JSONB DEFAULT '[]'::jsonb;

-- Note: RLS policies on public.profiles already restrict SELECT, UPDATE, and INSERT
-- to auth.uid() = id, automatically securing all personalization data without 
-- requiring additional policy alterations.
