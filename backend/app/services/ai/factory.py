from backend.app.core.config import settings
from backend.app.services.ai.base import AIProvider
from backend.app.services.ai.mock import MockAIProvider
from backend.app.core.logging import logger

_provider_instance: AIProvider = None


def get_ai_provider() -> AIProvider:
    """Returns the singleton AIProvider instance according to application settings."""
    global _provider_instance
    if _provider_instance is None:
        provider_type = settings.AI_PROVIDER.lower()
        if provider_type == "mock" or not settings.LLM_API_KEY:
            logger.info("Initializing MockAIProvider for deterministic local execution.")
            _provider_instance = MockAIProvider()
        else:
            # Stage 06 will integrate Gemini and OpenAI client adapters
            logger.info(f"AI Provider '{provider_type}' specified with key. Initializing provider fallback.")
            _provider_instance = MockAIProvider()

    return _provider_instance
