-- ==============================================================================
-- NEXORA - PostgreSQL / Supabase Migration
-- Master Prompt 04 Correction Patch: Learning Preferences & Language Persistence
-- ==============================================================================

-- 1. Extend profiles table with dedicated learning_preferences JSONB array
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS learning_preferences JSONB DEFAULT '["visual", "practical", "step_by_step"]'::jsonb;

-- 2. Backfill any existing profiles that have null or empty learning_preferences
UPDATE public.profiles 
SET learning_preferences = '["visual", "practical", "step_by_step"]'::jsonb 
WHERE learning_preferences IS NULL OR learning_preferences = '[]'::jsonb;

-- 3. Ensure preferred_language has stable default 'en'
ALTER TABLE public.profiles 
ALTER COLUMN preferred_language SET DEFAULT 'en';

-- 4. Update the handle_new_user() trigger function to ensure all new accounts
-- receive all available learning preferences enabled by default and persistent language
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (
        id,
        email,
        full_name,
        avatar_url,
        education_level,
        preferred_language,
        institution,
        interests,
        custom_interests,
        favorite_subjects,
        learning_preferences,
        preferred_learning_style,
        enable_code_mixing,
        created_at,
        updated_at
    )
    VALUES (
        new.id,
        new.email,
        COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
        new.raw_user_meta_data->>'avatar_url',
        COALESCE(new.raw_user_meta_data->>'education_level', 'undergraduate'),
        COALESCE(new.raw_user_meta_data->>'preferred_language', 'en'),
        new.raw_user_meta_data->>'institution',
        COALESCE((new.raw_user_meta_data->>'interests')::jsonb, '[]'::jsonb),
        COALESCE((new.raw_user_meta_data->>'custom_interests')::jsonb, '[]'::jsonb),
        COALESCE((new.raw_user_meta_data->>'favorite_subjects')::jsonb, '[]'::jsonb),
        COALESCE((new.raw_user_meta_data->>'learning_preferences')::jsonb, '["visual", "practical", "step_by_step"]'::jsonb),
        COALESCE(new.raw_user_meta_data->>'preferred_learning_style', 'visual'),
        COALESCE((new.raw_user_meta_data->>'enable_code_mixing')::boolean, TRUE),
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN new;
END;
$$;
