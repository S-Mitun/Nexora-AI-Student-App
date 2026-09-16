from app.core.config import Settings


def test_settings_defaults():
    """Verifies that configuration defaults are properly loaded and safe."""
    s = Settings()
    assert s.PROJECT_NAME == "NEXORA Backend API"
    assert s.VERSION == "0.1.0"
    assert s.API_V1_STR == "/api/v1"
    assert s.PORT == 8000
    assert not s.is_production()


def test_masked_config():
    """Verifies that get_masked_config hides any raw secrets."""
    s = Settings(LLM_API_KEY="super-secret-key-123", SUPABASE_SERVICE_ROLE_KEY="role-secret-key")
    masked = s.get_masked_config()
    assert "super-secret-key-123" not in str(masked)
    assert "role-secret-key" not in str(masked)
    assert masked["LLM_CONFIGURED"] is True
