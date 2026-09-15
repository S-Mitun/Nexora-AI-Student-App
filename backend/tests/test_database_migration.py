import os
from pathlib import Path
from backend.app.core.config import Settings
from backend.app.core.security import SecurityContext, AuthenticatedUser


def test_supabase_configuration_detection():
    """Check 4: Supabase configuration is detected correctly."""
    # Without credentials
    default_settings = Settings(SUPABASE_URL="", SUPABASE_ANON_KEY="")
    assert default_settings.get_masked_config()["SUPABASE_CONFIGURED"] is False

    # With credentials provided
    configured_settings = Settings(
        SUPABASE_URL="https://test-ref.supabase.co",
        SUPABASE_ANON_KEY="test-anon-key",
    )
    assert configured_settings.get_masked_config()["SUPABASE_CONFIGURED"] is True


def test_database_migration_and_rls_policies():
    """Check 5 & 7: Database migrations are valid and RLS policies are present where required."""
    root_dir = Path(__file__).resolve().parent.parent.parent
    migration_file = root_dir / "supabase" / "migrations" / "20260916000000_initial_schema.sql"
    
    assert migration_file.exists(), f"Migration file missing at: {migration_file}"
    content = migration_file.read_text(encoding="utf-8")

    # Required tables present in DDL
    required_tables = [
        "profiles",
        "subjects",
        "topics",
        "concepts",
        "learning_modules",
        "documents",
        "document_chunks",
        "chat_sessions",
        "chat_messages",
        "notes",
        "user_progress",
        "quiz_attempts",
    ]
    for table in required_tables:
        assert f"CREATE TABLE IF NOT EXISTS public.{table}" in content, f"Table {table} missing from migration"

    # Verify Row Level Security is explicitly enabled on all user-owned tables
    user_owned_tables = [
        "profiles",
        "documents",
        "document_chunks",
        "chat_sessions",
        "chat_messages",
        "notes",
        "user_progress",
        "quiz_attempts",
    ]
    for table in user_owned_tables:
        assert f"ALTER TABLE public.{table} ENABLE ROW LEVEL SECURITY;" in content, f"RLS not enabled for {table}"
        assert f"CREATE POLICY" in content and table in content, f"RLS policy missing for {table}"


def test_auth_foundation_wired():
    """Check 6: Authentication foundation is correctly wired."""
    # Test verification interface
    valid_user = SecurityContext.verify_jwt_token("dev-student-12345")
    assert valid_user is not None
    assert isinstance(valid_user, AuthenticatedUser)
    assert valid_user.id == "12345"
    assert valid_user.is_authenticated is True

    # Test empty or invalid token
    invalid_user = SecurityContext.verify_jwt_token("")
    assert invalid_user is None
