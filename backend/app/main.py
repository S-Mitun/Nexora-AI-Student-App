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
                    if "curriculum_id" not in existing_cols:
                        conn.execute(text("ALTER TABLE profiles ADD COLUMN curriculum_id VARCHAR(36)"))
                    if "grade_level" not in existing_cols:
                        conn.execute(text("ALTER TABLE profiles ADD COLUMN grade_level VARCHAR(50) DEFAULT 'Class 10'"))
                    if "academic_domain" not in existing_cols:
                        conn.execute(text("ALTER TABLE profiles ADD COLUMN academic_domain VARCHAR(100) DEFAULT 'General Studies'"))
                    if "education_category" not in existing_cols:
                        conn.execute(text("ALTER TABLE profiles ADD COLUMN education_category VARCHAR(50) DEFAULT 'undergraduate'"))
                    if "board_type" not in existing_cols:
                        conn.execute(text("ALTER TABLE profiles ADD COLUMN board_type VARCHAR(50)"))
                    if "stream" not in existing_cols:
                        conn.execute(text("ALTER TABLE profiles ADD COLUMN stream VARCHAR(100)"))
                    if "program" not in existing_cols:
                        conn.execute(text("ALTER TABLE profiles ADD COLUMN program VARCHAR(100)"))
                    if "state_region" not in existing_cols:
                        conn.execute(text("ALTER TABLE profiles ADD COLUMN state_region VARCHAR(100)"))
                    if "degree" not in existing_cols:
                        conn.execute(text("ALTER TABLE profiles ADD COLUMN degree VARCHAR(100)"))
                    if "department" not in existing_cols:
                        conn.execute(text("ALTER TABLE profiles ADD COLUMN department VARCHAR(100)"))
                    if "specialization" not in existing_cols:
                        conn.execute(text("ALTER TABLE profiles ADD COLUMN specialization VARCHAR(100)"))
                    if "academic_year" not in existing_cols:
                        conn.execute(text("ALTER TABLE profiles ADD COLUMN academic_year VARCHAR(50)"))
                    if "profile_completed" not in existing_cols:
                        conn.execute(text("ALTER TABLE profiles ADD COLUMN profile_completed BOOLEAN DEFAULT 0"))
                    conn.commit()

                # Sync curricula table columns
                cur_cols = {row[1] for row in conn.execute(text("PRAGMA table_info(curricula)"))}
                if cur_cols:
                    if "board_type" not in cur_cols:
                        conn.execute(text("ALTER TABLE curricula ADD COLUMN board_type VARCHAR(50) DEFAULT 'national_board'"))
                    if "state_region" not in cur_cols:
                        conn.execute(text("ALTER TABLE curricula ADD COLUMN state_region VARCHAR(100)"))
                    if "stream" not in cur_cols:
                        conn.execute(text("ALTER TABLE curricula ADD COLUMN stream VARCHAR(100)"))
                    if "program" not in cur_cols:
                        conn.execute(text("ALTER TABLE curricula ADD COLUMN program VARCHAR(100)"))
                    conn.commit()

                # Sync user_progress table columns
                prog_cols = {row[1] for row in conn.execute(text("PRAGMA table_info(user_progress)"))}
                if prog_cols:
                    if "academic_level" not in prog_cols:
                        conn.execute(text("ALTER TABLE user_progress ADD COLUMN academic_level VARCHAR(50) DEFAULT 'undergraduate'"))
                    if "subject_id" not in prog_cols:
                        conn.execute(text("ALTER TABLE user_progress ADD COLUMN subject_id VARCHAR(36)"))
                    if "module_id" not in prog_cols:
                        conn.execute(text("ALTER TABLE user_progress ADD COLUMN module_id VARCHAR(36)"))
                    if "lesson_id" not in prog_cols:
                        conn.execute(text("ALTER TABLE user_progress ADD COLUMN lesson_id VARCHAR(36)"))
                    conn.commit()

                # Sync quiz_attempts table columns
                quiz_cols = {row[1] for row in conn.execute(text("PRAGMA table_info(quiz_attempts)"))}
                if quiz_cols:
                    if "academic_level" not in quiz_cols:
                        conn.execute(text("ALTER TABLE quiz_attempts ADD COLUMN academic_level VARCHAR(50) DEFAULT 'undergraduate'"))
                    if "subject_id" not in quiz_cols:
                        conn.execute(text("ALTER TABLE quiz_attempts ADD COLUMN subject_id VARCHAR(36)"))
                    conn.commit()

                # Sync notes table columns
                note_cols = {row[1] for row in conn.execute(text("PRAGMA table_info(notes)"))}
                if note_cols:
                    if "academic_level" not in note_cols:
                        conn.execute(text("ALTER TABLE notes ADD COLUMN academic_level VARCHAR(50) DEFAULT 'undergraduate'"))
                    if "subject_id" not in note_cols:
                        conn.execute(text("ALTER TABLE notes ADD COLUMN subject_id VARCHAR(36)"))
                    if "module_id" not in note_cols:
                        conn.execute(text("ALTER TABLE notes ADD COLUMN module_id VARCHAR(36)"))
                    if "lesson_id" not in note_cols:
                        conn.execute(text("ALTER TABLE notes ADD COLUMN lesson_id VARCHAR(36)"))
                    if "source_reference" not in note_cols:
                        conn.execute(text("ALTER TABLE notes ADD COLUMN source_reference VARCHAR(255)"))
                    conn.commit()

                # Sync subjects table columns
                subj_cols = {row[1] for row in conn.execute(text("PRAGMA table_info(subjects)"))}
                if subj_cols:
                    if "curriculum_id" not in subj_cols:
                        conn.execute(text("ALTER TABLE subjects ADD COLUMN curriculum_id VARCHAR(36)"))
                    if "category" not in subj_cols:
                        conn.execute(text("ALTER TABLE subjects ADD COLUMN category VARCHAR(100) DEFAULT 'Computer Science & Engineering'"))
                    if "difficulty_level" not in subj_cols:
                        conn.execute(text("ALTER TABLE subjects ADD COLUMN difficulty_level VARCHAR(50) DEFAULT 'all-levels'"))
                    if "is_active" not in subj_cols:
                        conn.execute(text("ALTER TABLE subjects ADD COLUMN is_active BOOLEAN DEFAULT 1"))
                    if "is_system" not in subj_cols:
                        conn.execute(text("ALTER TABLE subjects ADD COLUMN is_system BOOLEAN DEFAULT 1"))
                    if "education_level" not in subj_cols:
                        conn.execute(text("ALTER TABLE subjects ADD COLUMN education_level VARCHAR(50) DEFAULT 'undergraduate'"))
                    if "academic_domain" not in subj_cols:
                        conn.execute(text("ALTER TABLE subjects ADD COLUMN academic_domain VARCHAR(100) DEFAULT 'General'"))
                    if "created_by_user_id" not in subj_cols:
                        conn.execute(text("ALTER TABLE subjects ADD COLUMN created_by_user_id VARCHAR(36)"))
                    # Ensure legacy CSE courses are explicitly undergraduate
                    conn.execute(text("UPDATE subjects SET education_level = 'undergraduate' WHERE (education_level = 'all-levels' OR education_level IS NULL) AND slug IN ('computer-science', 'data-structures-algorithms', 'operating-systems', 'database-management-systems', 'computer-networks', 'artificial-intelligence-machine-learning')"))
                    conn.commit()

                # Sync student_subjects table columns
                ss_cols = {row[1] for row in conn.execute(text("PRAGMA table_info(student_subjects)"))}
                if ss_cols:
                    if "academic_level" not in ss_cols:
                        conn.execute(text("ALTER TABLE student_subjects ADD COLUMN academic_level VARCHAR(50) DEFAULT 'undergraduate'"))
                    # Backfill legacy records from subjects.education_level if available
                    conn.execute(text("""
                        UPDATE student_subjects 
                        SET academic_level = (
                            SELECT CASE 
                                WHEN subjects.education_level IN ('primary', 'class-1-5') THEN 'class_1_5'
                                WHEN subjects.education_level IN ('secondary', 'class-6-10') THEN 'class_6_10'
                                WHEN subjects.education_level IN ('higher_secondary', 'class-11-12') THEN 'class_11_12'
                                ELSE 'undergraduate'
                            END
                            FROM subjects 
                            WHERE subjects.id = student_subjects.subject_id
                        )
                        WHERE academic_level IS NULL OR academic_level = 'undergraduate'
                    """))
                    conn.commit()

                # Sync documents table columns
                doc_cols = {row[1] for row in conn.execute(text("PRAGMA table_info(documents)"))}
                if doc_cols:
                    if "curriculum_id" not in doc_cols:
                        conn.execute(text("ALTER TABLE documents ADD COLUMN curriculum_id VARCHAR(36)"))
                    if "subject_id" not in doc_cols:
                        conn.execute(text("ALTER TABLE documents ADD COLUMN subject_id VARCHAR(36)"))
                    if "language" not in doc_cols:
                        conn.execute(text("ALTER TABLE documents ADD COLUMN language VARCHAR(10) DEFAULT 'en'"))
                    if "version" not in doc_cols:
                        conn.execute(text("ALTER TABLE documents ADD COLUMN version INTEGER DEFAULT 1"))
                    if "progress_percent" not in doc_cols:
                        conn.execute(text("ALTER TABLE documents ADD COLUMN progress_percent INTEGER DEFAULT 0"))
                    if "processing_stage" not in doc_cols:
                        conn.execute(text("ALTER TABLE documents ADD COLUMN processing_stage VARCHAR(50) DEFAULT 'queued'"))
                    if "error_message" not in doc_cols:
                        conn.execute(text("ALTER TABLE documents ADD COLUMN error_message TEXT"))
                    if "page_count" not in doc_cols:
                        conn.execute(text("ALTER TABLE documents ADD COLUMN page_count INTEGER DEFAULT 0"))
                    if "content_hash" not in doc_cols:
                        conn.execute(text("ALTER TABLE documents ADD COLUMN content_hash VARCHAR(64)"))
                    conn.commit()

                # Sync document_chunks table columns
                chunk_cols = {row[1] for row in conn.execute(text("PRAGMA table_info(document_chunks)"))}
                if chunk_cols and "page_number" not in chunk_cols:
                    conn.execute(text("ALTER TABLE document_chunks ADD COLUMN page_number INTEGER DEFAULT 1"))
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
                    if "has_simulation" not in con_cols:
                        conn.execute(text("ALTER TABLE concepts ADD COLUMN has_simulation BOOLEAN DEFAULT 0"))
                    if "has_visualization" not in con_cols:
                        conn.execute(text("ALTER TABLE concepts ADD COLUMN has_visualization BOOLEAN DEFAULT 0"))
                    if "has_practice" not in con_cols:
                        conn.execute(text("ALTER TABLE concepts ADD COLUMN has_practice BOOLEAN DEFAULT 1"))
                    if "has_lab" not in con_cols:
                        conn.execute(text("ALTER TABLE concepts ADD COLUMN has_lab BOOLEAN DEFAULT 0"))
                    if "has_mindmap" not in con_cols:
                        conn.execute(text("ALTER TABLE concepts ADD COLUMN has_mindmap BOOLEAN DEFAULT 1"))
                    if "learning_modes" not in con_cols:
                        conn.execute(text("ALTER TABLE concepts ADD COLUMN learning_modes JSON DEFAULT '[\"learn\", \"ask\", \"practice\", \"notes\"]'"))
                    conn.commit()
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

                # Sync notes table columns
                note_cols = {row[1] for row in conn.execute(text("PRAGMA table_info(notes)"))}
                if note_cols:
                    if "tags" not in note_cols:
                        conn.execute(text("ALTER TABLE notes ADD COLUMN tags JSON DEFAULT '[]'"))
                    if "is_pinned" not in note_cols:
                        conn.execute(text("ALTER TABLE notes ADD COLUMN is_pinned BOOLEAN DEFAULT 0"))
                    if "is_archived" not in note_cols:
                        conn.execute(text("ALTER TABLE notes ADD COLUMN is_archived BOOLEAN DEFAULT 0"))
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
