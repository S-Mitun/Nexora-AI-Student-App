import time
from typing import Dict, Optional, Tuple, List
import jwt
import httpx
from pydantic import BaseModel, Field
from app.core.config import settings
from app.core.logging import logger


class AuthenticatedUser(BaseModel):
    """Normalized authenticated user context across Supabase and custom auth providers."""
    id: str = Field(..., description="Unique user identifier (UUID)")
    email: Optional[str] = Field(None, description="User email address")
    role: str = Field("student", description="User authorization role (student, educator, admin)")
    is_authenticated: bool = Field(True, description="Authentication flag")
    provider: Optional[str] = Field(None, description="Primary authentication provider (email, google)")
    identities: Optional[List[str]] = Field(default_factory=list, description="Linked authentication providers")


class SecurityContext:
    """Security provider interface for Supabase Auth, JWT verification, and student identity."""

    # Short-lived in-memory cache for validated tokens: token -> (AuthenticatedUser, expire_timestamp)
    _token_cache: Dict[str, Tuple[AuthenticatedUser, float]] = {}
    CACHE_TTL_SECONDS: float = 60.0

    @classmethod
    def verify_jwt_token(cls, token: str) -> Optional[AuthenticatedUser]:
        """
        Validates an access token and returns the authenticated user identity.
        Verification strategy:
        1. In-memory token cache (60s TTL).
        2. Development bypass tokens ('dev-student-...').
        3. Local JWT signature verification using configured JWT_SECRET_KEY.
        4. Remote Supabase Auth API verification (/auth/v1/user) when SUPABASE_URL is configured.
        """
        if not token or not token.strip():
            return None

        clean_token = token.strip()

        # 1. Check cache
        now = time.time()
        if clean_token in cls._token_cache:
            cached_user, expires_at = cls._token_cache[clean_token]
            if now < expires_at:
                return cached_user
            else:
                del cls._token_cache[clean_token]

        # 2. Local development token
        if clean_token.startswith("dev-student-"):
            user_id = clean_token.replace("dev-student-", "") or "00000000-0000-0000-0000-000000000001"
            dev_user = AuthenticatedUser(
                id=user_id,
                email="student@nexora.dev",
                role="student",
                is_authenticated=True,
                provider="email",
                identities=["email"],
            )
            cls._token_cache[clean_token] = (dev_user, now + cls.CACHE_TTL_SECONDS)
            return dev_user

        # 3. Try local JWT decode with JWT_SECRET_KEY
        try:
            payload = jwt.decode(
                clean_token,
                settings.JWT_SECRET_KEY,
                algorithms=[settings.JWT_ALGORITHM, "HS256"],
                options={"verify_signature": True, "verify_exp": True},
            )
            user_id = payload.get("sub") or payload.get("user_id") or payload.get("id")
            if user_id:
                app_meta = payload.get("app_metadata", {})
                primary_prov = app_meta.get("provider", "email")
                provs = app_meta.get("providers", [primary_prov])
                verified_user = AuthenticatedUser(
                    id=str(user_id),
                    email=payload.get("email"),
                    role=payload.get("role", "student"),
                    is_authenticated=True,
                    provider=primary_prov,
                    identities=provs,
                )
                cls._token_cache[clean_token] = (verified_user, now + cls.CACHE_TTL_SECONDS)
                return verified_user
        except (jwt.ExpiredSignatureError, jwt.InvalidSignatureError, jwt.DecodeError):
            # Continue to Supabase remote check
            pass
        except Exception as e:
            logger.debug(f"Local JWT decode skipped: {e}")

        # 4. Try remote Supabase Auth verification
        if settings.SUPABASE_URL and settings.SUPABASE_URL.startswith("http"):
            try:
                auth_endpoint = f"{settings.SUPABASE_URL.rstrip('/')}/auth/v1/user"
                api_key = settings.SUPABASE_SERVICE_ROLE_KEY or settings.SUPABASE_ANON_KEY
                headers = {
                    "Authorization": f"Bearer {clean_token}",
                }
                if api_key:
                    headers["apikey"] = api_key

                with httpx.Client(timeout=4.0) as client:
                    response = client.get(auth_endpoint, headers=headers)
                    if response.status_code == 200:
                        user_data = response.json()
                        user_id = user_data.get("id")
                        if user_id:
                            app_meta = user_data.get("app_metadata", {})
                            identities_list = user_data.get("identities", [])
                            providers_set = set()
                            if isinstance(app_meta.get("providers"), list):
                                providers_set.update(app_meta["providers"])
                            if app_meta.get("provider"):
                                providers_set.add(app_meta["provider"])
                            for id_entry in identities_list:
                                if isinstance(id_entry, dict) and id_entry.get("provider"):
                                    providers_set.add(id_entry["provider"])
                            if not providers_set:
                                providers_set.add("email")

                            primary_prov = app_meta.get("provider") or next(iter(providers_set), "email")

                            supabase_user = AuthenticatedUser(
                                id=str(user_id),
                                email=user_data.get("email"),
                                role=user_data.get("role", "student"),
                                is_authenticated=True,
                                provider=primary_prov,
                                identities=list(providers_set),
                            )
                            cls._token_cache[clean_token] = (supabase_user, now + cls.CACHE_TTL_SECONDS)
                            return supabase_user
            except Exception as e:
                logger.warning(f"Supabase Auth verification call failed: {e}")

        return None

    @classmethod
    def create_test_jwt(
        cls,
        user_id: str,
        email: str = "student@nexora.dev",
        role: str = "student",
        provider: str = "email",
        identities: Optional[List[str]] = None,
        expires_in_seconds: int = 3600,
    ) -> str:
        """Helper to create a signed test JWT for unit testing and local development."""
        provs = identities or [provider]
        payload = {
            "sub": user_id,
            "email": email,
            "role": role,
            "app_metadata": {
                "provider": provider,
                "providers": provs,
            },
            "iat": int(time.time()),
            "exp": int(time.time() + expires_in_seconds),
        }
        return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
