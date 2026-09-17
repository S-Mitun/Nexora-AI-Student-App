from contextlib import asynccontextmanager
import time
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError

from app.core.config import settings
from app.core.logging import logger
from app.db.base import Base
from app.db.session import engine
from app.api.v1.router import api_v1_router
from app.api.v1.routes.health import get_health


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan event handler for startup and shutdown procedures."""
    logger.info(f"Starting {settings.PROJECT_NAME} v{settings.VERSION} [{settings.ENVIRONMENT}]")
    logger.info(f"Loaded configuration: {settings.get_masked_config()}")
    
    # In development, auto-create database tables
    try:
        Base.metadata.create_all(bind=engine)
        # Synchronize any missing columns for SQLite local development
        if "sqlite" in str(engine.url):
            from sqlalchemy import text
            with engine.connect() as conn:
                existing_cols = {row[1] for row in conn.execute(text("PRAGMA table_info(profiles)"))}
                if existing_cols:
                    if "institution" not in existing_cols:
                        conn.execute(text("ALTER TABLE profiles ADD COLUMN institution VARCHAR(255)"))
                    if "interests" not in existing_cols:
                        conn.execute(text("ALTER TABLE profiles ADD COLUMN interests JSON"))
                    if "enable_code_mixing" not in existing_cols:
                        conn.execute(text("ALTER TABLE profiles ADD COLUMN enable_code_mixing BOOLEAN DEFAULT 0"))
                    if "favorite_subjects" not in existing_cols:
                        conn.execute(text("ALTER TABLE profiles ADD COLUMN favorite_subjects JSON"))
                    if "preferred_learning_style" not in existing_cols:
                        conn.execute(text("ALTER TABLE profiles ADD COLUMN preferred_learning_style VARCHAR(50) DEFAULT 'balanced'"))
                    if "custom_interests" not in existing_cols:
                        conn.execute(text("ALTER TABLE profiles ADD COLUMN custom_interests JSON"))
                    if "learning_preferences" not in existing_cols:
                        conn.execute(text("ALTER TABLE profiles ADD COLUMN learning_preferences JSON DEFAULT '[\"visual\", \"practical\", \"step_by_step\"]'"))
                        conn.execute(text("UPDATE profiles SET learning_preferences = '[\"visual\", \"practical\", \"step_by_step\"]' WHERE learning_preferences IS NULL OR learning_preferences = '[]'"))
                    conn.commit()

                # Sync subjects table columns
                subj_cols = {row[1] for row in conn.execute(text("PRAGMA table_info(subjects)"))}
                if subj_cols:
                    if "category" not in subj_cols:
                        conn.execute(text("ALTER TABLE subjects ADD COLUMN category VARCHAR(100) DEFAULT 'Computer Science & Engineering'"))
                    if "difficulty_level" not in subj_cols:
                        conn.execute(text("ALTER TABLE subjects ADD COLUMN difficulty_level VARCHAR(50) DEFAULT 'all-levels'"))
                    if "is_active" not in subj_cols:
                        conn.execute(text("ALTER TABLE subjects ADD COLUMN is_active BOOLEAN DEFAULT 1"))
                    conn.commit()

                # Sync topics table columns
                top_cols = {row[1] for row in conn.execute(text("PRAGMA table_info(topics)"))}
                if top_cols and "is_active" not in top_cols:
                    conn.execute(text("ALTER TABLE topics ADD COLUMN is_active BOOLEAN DEFAULT 1"))
                    conn.commit()

                # Sync concepts table columns
                con_cols = {row[1] for row in conn.execute(text("PRAGMA table_info(concepts)"))}
                if con_cols:
                    if "short_description" not in con_cols:
                        conn.execute(text("ALTER TABLE concepts ADD COLUMN short_description TEXT"))
                    if "difficulty_level" not in con_cols:
                        conn.execute(text("ALTER TABLE concepts ADD COLUMN difficulty_level VARCHAR(50) DEFAULT 'intermediate'"))
                    if "is_active" not in con_cols:
                        conn.execute(text("ALTER TABLE concepts ADD COLUMN is_active BOOLEAN DEFAULT 1"))
                    conn.commit()

                # Sync learning_modules table columns
                mod_cols = {row[1] for row in conn.execute(text("PRAGMA table_info(learning_modules)"))}
                if mod_cols:
                    if "slug" not in mod_cols:
                        conn.execute(text("ALTER TABLE learning_modules ADD COLUMN slug VARCHAR(255) DEFAULT ''"))
                    if "description" not in mod_cols:
                        conn.execute(text("ALTER TABLE learning_modules ADD COLUMN description TEXT"))
                    if "learning_objective" not in mod_cols:
                        conn.execute(text("ALTER TABLE learning_modules ADD COLUMN learning_objective TEXT"))
                    if "difficulty_level" not in mod_cols:
                        conn.execute(text("ALTER TABLE learning_modules ADD COLUMN difficulty_level VARCHAR(50) DEFAULT 'intermediate'"))
                    if "estimated_minutes" not in mod_cols:
                        conn.execute(text("ALTER TABLE learning_modules ADD COLUMN estimated_minutes INTEGER DEFAULT 15"))
                    if "order_index" not in mod_cols:
                        conn.execute(text("ALTER TABLE learning_modules ADD COLUMN order_index INTEGER DEFAULT 0"))
                    if "is_active" not in mod_cols:
                        conn.execute(text("ALTER TABLE learning_modules ADD COLUMN is_active BOOLEAN DEFAULT 1"))
                    conn.commit()

        # Seed starter curriculum if empty
        from app.db.session import SessionLocal
        from app.services.learning.curriculum_service import CurriculumSeedService
        with SessionLocal() as session:
            CurriculumSeedService.seed_if_empty(session)

        logger.info("Database schema synchronized and starter curriculum verified.")
    except Exception as e:
        logger.error(f"Error creating database tables: {str(e)}")

    yield

    logger.info(f"Shutting down {settings.PROJECT_NAME}...")


app = FastAPI(
    title=settings.PROJECT_NAME,
    description="NEXORA - AI-Powered Experience-First Learning Companion API",
    version=settings.VERSION,
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# Configure CORS
origins = settings.CORS_ORIGINS if isinstance(settings.CORS_ORIGINS, list) else ["*"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Structured Request Logging Middleware
@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    duration = time.time() - start_time
    logger.info(f"{request.method} {request.url.path} -> {response.status_code} ({duration:.3f}s)")
    return response


# Global Exception Handlers (Prevent credential / stack trace leaks)
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    logger.warning(f"Validation error on {request.url.path}: {exc.errors()}")
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "success": False,
            "error_code": "VALIDATION_ERROR",
            "message": "The request payload failed schema validation.",
            "details": exc.errors(),
        },
    )


@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception on {request.url.path}: {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "success": False,
            "error_code": "INTERNAL_SERVER_ERROR",
            "message": "An unexpected server error occurred. Please try again later.",
        },
    )


# Root health endpoint (Section 26: GET /health)
@app.get("/health", tags=["Health"])
def root_health():
    """Root health verification endpoint."""
    return get_health()


# Mount versioned API routes
app.include_router(api_v1_router, prefix=settings.API_V1_STR)


@app.get("/", tags=["Root"])
def root_info():
    """Root discovery endpoint."""
    return {
        "project": "NEXORA",
        "tagline": settings.TAGLINE,
        "version": settings.VERSION,
        "docs": "/docs",
        "health": "/health",
        "api_v1": settings.API_V1_STR,
    }
