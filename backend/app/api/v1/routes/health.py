from datetime import datetime, timezone
from fastapi import APIRouter
from backend.app.schemas.health import HealthResponse, SystemStatus
from backend.app.core.config import settings

router = APIRouter(tags=["Health"])


@router.get("/health", response_model=HealthResponse)
def get_health() -> HealthResponse:
    """Returns application health, version, and active status without performing expensive I/O."""
    return HealthResponse(
        status="healthy",
        timestamp=datetime.now(timezone.utc).isoformat(),
        project="NEXORA",
        tagline=settings.TAGLINE,
        system=SystemStatus(
            api="healthy",
            database="operational",
            environment=settings.ENVIRONMENT,
            version=settings.VERSION,
        ),
        capabilities={
            "learning_engine": True,
            "ai_abstraction": True,
            "vector_abstraction": True,
            "rag_chatbot": False,  # Stage 06
            "virtual_labs": False,  # Stage 10
            "mind_map": False,      # Stage 23
        },
    )
