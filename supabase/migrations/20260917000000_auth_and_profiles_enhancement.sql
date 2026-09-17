-- ==============================================================================
-- NEXORA - PostgreSQL / Supabase Migration
-- Master Prompt 03: Auth & Student Profiles Enhancement
-- ==============================================================================

-- 1. Extend profiles table with student settings and personalization fields
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS institution VARCHAR(255);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS interests JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS enable_code_mixing BOOLEAN DEFAULT TRUE;

-- 2. Explicit INSERT policy for public.profiles
-- Allows an authenticated user to insert their own profile record if not already created
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'profiles' 
        AND policyname = 'Users can insert own profile'
    ) THEN
        CREATE POLICY "Users can insert own profile" ON public.profiles
            FOR INSERT WITH CHECK (auth.uid() = id);
    END IF;
END $$;

-- 3. Automatic Profile Provisioning Function & Trigger
-- Automatically creates a corresponding profile row whenever a new user signs up in auth.users
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
        COALESCE((new.raw_user_meta_data->>'enable_code_mixing')::boolean, TRUE),
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN new;
END;
$$;

-- 4. Create trigger on auth.users if trigger does not already exist
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
