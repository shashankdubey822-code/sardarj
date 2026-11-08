"""Application settings and environment configuration."""

from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Central application configuration managed via pydantic-settings.

    Attributes:
        whatsapp_token: Meta WhatsApp Cloud API access token.
        phone_number_id: Sender WhatsApp Business Phone Number ID.
        verify_token: Webhook verification token for handshake verification.
        meta_app_secret: Meta App Secret for HMAC-SHA256 signature validation.
        gemini_api_key: Google Gemini API key.
        gemini_model: Configurable Gemini model identifier.
        database_url: SQLAlchemy async database URL (SQLite local, Postgres prod).
        graph_api_version: Meta Graph API version string.
        log_level: Logging severity level (DEBUG, INFO, WARNING, ERROR, CRITICAL).
        max_history_messages: Maximum conversation history turns retained.
    """

    whatsapp_token: str = ""
    phone_number_id: str = ""
    verify_token: str = ""
    meta_app_secret: str = ""
    gemini_api_key: str = ""
    gemini_model: str = "gemini-3.5-flash-lite"
    database_url: str = "sqlite+aiosqlite:///./whatsapp_bot.db"
    graph_api_version: str = "v25.0"
    log_level: str = "INFO"
    max_history_messages: int = 12
    supabase_url: str = ""
    supabase_project_ref: str = ""
    supabase_access_token: str = ""
    supabase_anon_key: str = ""
    supabase_service_role_key: str = ""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    @property
    def async_database_url(self) -> str:
        """Return the database URL normalized for SQLAlchemy async dialects."""
        url = self.database_url
        if url.startswith("postgres://"):
            return url.replace("postgres://", "postgresql+asyncpg://", 1)
        if url.startswith("postgresql://") and not url.startswith("postgresql+asyncpg://"):
            return url.replace("postgresql://", "postgresql+asyncpg://", 1)
        if url.startswith("sqlite://") and not url.startswith("sqlite+aiosqlite://"):
            return url.replace("sqlite://", "sqlite+aiosqlite://", 1)
        return url


@lru_cache
def get_settings() -> Settings:
    """Retrieve and cache singleton application settings.

    Returns:
        Settings: The loaded application configuration instance.
    """
    return Settings()
