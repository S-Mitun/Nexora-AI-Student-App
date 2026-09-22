from fastapi import APIRouter
from app.api.v1.routes import health, learning, chat, documents, auth, profile, notes, syllabi
from app.api.v1.routes.workspace import workspace_router

api_v1_router = APIRouter()

api_v1_router.include_router(health.router)
api_v1_router.include_router(auth.router)
api_v1_router.include_router(profile.router)
api_v1_router.include_router(workspace_router, prefix="/workspace")
api_v1_router.include_router(syllabi.router)

# Alias router for /syllabus/state
syllabus_alias_router = APIRouter(prefix="/syllabus", tags=["Universal Syllabus & Academic Document Lifecycle"])
syllabus_alias_router.add_api_route(
    "/state",
    syllabi.get_syllabus_state,
    methods=["GET"],
    response_model=syllabi.SyllabusCanonicalStateResponse,
    summary="Canonical Syllabus State Alias",
)
api_v1_router.include_router(syllabus_alias_router)

api_v1_router.include_router(learning.router)
api_v1_router.include_router(learning.curriculum_alias_router)
api_v1_router.include_router(notes.router)
api_v1_router.include_router(chat.router)
api_v1_router.include_router(documents.router)

