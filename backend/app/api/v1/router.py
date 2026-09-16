from fastapi import APIRouter
from app.api.v1.routes import health, learning, chat, documents

api_v1_router = APIRouter()

api_v1_router.include_router(health.router)
api_v1_router.include_router(learning.router)
api_v1_router.include_router(chat.router)
api_v1_router.include_router(documents.router)
