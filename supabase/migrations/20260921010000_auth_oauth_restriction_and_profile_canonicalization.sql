-- ==============================================================================
-- NEXORA - PostgreSQL / Supabase Migration
-- Master Prompt 01R-A: OAuth Restriction & Canonical Profile Completion
-- ==============================================================================

-- 1. Server-Side Google/OAuth Registration Entry Control
-- Prevents automatic creation of new NEXORA accounts from unknown Google identities.
-- A user must first explicitly register a NEXORA account.
-- Legitimate existing email accounts will be linked by Supabase Auth (via auth.identities)
-- under the existing user's UUID without firing a new INSERT on auth.users.

CREATE OR REPLACE FUNCTION public.check_new_oauth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public, auth
AS $$
DECLARE
    provider_name text;
BEGIN
    provider_name := NEW.raw_app_meta_data->>'provider';

    -- If provider is an external OAuth provider (such as google)
    IF (provider_name IS NOT NULL AND provider_name <> '' AND provider_name <> 'email') THEN
        -- Check if an existing profile already exists with this exact email
        -- If an account was previously created via NEXORA email registration or prior supported config,
        -- Supabase identity linking should preserve the same UUID.
        -- When Supabase reaches BEFORE INSERT on auth.users with an OAuth provider,
        -- it signifies an unknown identity attempting account creation.
        RAISE EXCEPTION 'ACCOUNT_NOT_FOUND: This Google account does not have a NEXORA account yet. Please create an account first.';
    END IF;

    RETURN NEW;
END;
$$;

-- Apply trigger before user creation in auth.users if auth schema exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'users') THEN
        DROP TRIGGER IF EXISTS tr_block_unregistered_oauth ON auth.users;
        CREATE TRIGGER tr_block_unregistered_oauth
            BEFORE INSERT ON auth.users
            FOR EACH ROW
            EXECUTE FUNCTION public.check_new_oauth_user();
    END IF;
END $$;

-- Supabase Auth Hook (Before User Created) compatible definition
CREATE OR REPLACE FUNCTION public.hook_before_user_created(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public, auth
AS $$
DECLARE
    provider text;
BEGIN
    provider := event->'user'->'app_metadata'->>'provider';

    IF (provider IS NOT NULL AND provider <> '' AND provider <> 'email') THEN
        RETURN jsonb_build_object(
            'error', jsonb_build_object(
                'message', 'Account not found. Create a NEXORA account first, then sign in with Google.',
                'status_code', 400
            )
        );
    END IF;

    RETURN jsonb_build_object('decision', 'continue');
END;
$$;

-- 2. Drop Default Values from profiles Table
-- Fields must be deterministic, explicit, and genuinely empty/null if unselected.
ALTER TABLE public.profiles ALTER COLUMN academic_domain DROP DEFAULT;
ALTER TABLE public.profiles ALTER COLUMN academic_domain DROP NOT NULL;
ALTER TABLE public.profiles ALTER COLUMN grade_level DROP DEFAULT;
ALTER TABLE public.profiles ALTER COLUMN education_level DROP DEFAULT;

-- Clear out any stale 'General Studies' that were populated merely by default
UPDATE public.profiles
SET academic_domain = NULL
WHERE academic_domain = 'General Studies';

-- 3. Update Profile Provisioning Trigger to avoid setting fake defaults
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
        education_category,
        grade_level,
        academic_domain,
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
        new.raw_user_meta_data->>'education_level',
        new.raw_user_meta_data->>'education_category',
        new.raw_user_meta_data->>'grade_level',
        new.raw_user_meta_data->>'academic_domain',
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
