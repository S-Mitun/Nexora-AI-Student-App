from fastapi import APIRouter
from app.api.v1.routes import health, learning, chat, documents, auth, profile

api_v1_router = APIRouter()

api_v1_router.include_router(health.router)
api_v1_router.include_router(auth.router)
api_v1_router.include_router(profile.router)
api_v1_router.include_router(learning.router)
api_v1_router.include_router(learning.curriculum_alias_router)
api_v1_router.include_router(chat.router)
api_v1_router.include_router(documents.router)
