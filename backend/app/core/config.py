import os
from typing import List, Union
from pydantic import AnyHttpUrl, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "NEXORA Backend API"
    TAGLINE: str = "Learn it. See it. Try it. Apply it. Master it."
    VERSION: str = "0.1.0"
    API_V1_STR: str = "/api/v1"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    PORT: int = 8000
    HOST: str = "0.0.0.0"

    # CORS
    CORS_ORIGINS: Union[List[str], str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
    ]

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",") if i.strip()]
        elif isinstance(v, (list, str)):
            return v
        raise ValueError(v)

    # Database
    DATABASE_URL: str = "sqlite:///./nexora.db"

    # Supabase & Auth
    SUPABASE_URL: str = ""
    SUPABASE_ANON_KEY: str = ""
    SUPABASE_SERVICE_ROLE_KEY: str = ""
    JWT_SECRET_KEY: str = "nexora-development-insecure-secret-key-change-in-prod"
    JWT_ALGORITHM: str = "HS256"

    # AI Configuration
    AI_PROVIDER: str = "mock"  # "mock" | "gemini" | "openai"
    LLM_API_KEY: str = ""
    LLM_MODEL: str = "gemini-1.5-pro"
    EMBEDDING_API_KEY: str = ""

    # Vector Store Configuration
    VECTOR_STORE_TYPE: str = "chroma"  # "chroma" | "pgvector"
    VECTOR_STORE_PATH: str = "./data/chromadb"

    # Logging
    LOG_LEVEL: str = "INFO"

    model_config = SettingsConfigDict(
        env_file=(
            os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), ".env"),
            os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))), ".env"),
            ".env",
            "backend/.env",
        ),
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )

    def is_production(self) -> bool:
        return self.ENVIRONMENT.lower() == "production"

    def get_masked_config(self) -> dict:
        """Return configuration safe for logging or debugging without leaking secrets."""
        return {
            "PROJECT_NAME": self.PROJECT_NAME,
            "ENVIRONMENT": self.ENVIRONMENT,
            "API_V1_STR": self.API_V1_STR,
            "AI_PROVIDER": self.AI_PROVIDER,
            "VECTOR_STORE_TYPE": self.VECTOR_STORE_TYPE,
            "DATABASE_TYPE": "sqlite" if "sqlite" in self.DATABASE_URL else "postgresql",
            "SUPABASE_CONFIGURED": bool(self.SUPABASE_URL and self.SUPABASE_ANON_KEY),
            "LLM_CONFIGURED": bool(self.LLM_API_KEY),
        }


settings = Settings()
