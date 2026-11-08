import pytest
from app.config import Settings


def test_default_settings(monkeypatch: pytest.MonkeyPatch) -> None:
    """Test that default configuration contains expected standard values."""
    monkeypatch.delenv("DATABASE_URL", raising=False)
    monkeypatch.delenv("GEMINI_MODEL", raising=False)
    monkeypatch.delenv("LOG_LEVEL", raising=False)
    monkeypatch.delenv("GRAPH_API_VERSION", raising=False)
    monkeypatch.delenv("MAX_HISTORY_MESSAGES", raising=False)
    settings = Settings(
        _env_file=None,  # Prevent reading .env in pure default unit test
        whatsapp_token="tok",
        phone_number_id="123",
        verify_token="ver",
        meta_app_secret="sec",
        gemini_api_key="key",
    )
    assert settings.database_url == "sqlite+aiosqlite:///./whatsapp_bot.db"
    assert settings.gemini_model == "gemini-3.5-flash-lite"
    assert settings.graph_api_version == "v25.0"
    assert settings.log_level == "INFO"
    assert settings.max_history_messages == 12


def test_settings_custom_values() -> None:
    """Test configuration override with custom parameters."""
    settings = Settings(
        _env_file=None,
        whatsapp_token="custom_token",
        phone_number_id="9999",
        verify_token="custom_ver",
        meta_app_secret="custom_secret",
        gemini_api_key="custom_gemini",
        gemini_model="gemini-2.5-flash",
        database_url="postgresql+asyncpg://user:pass@localhost:5432/bot",
        graph_api_version="v26.0",
        log_level="DEBUG",
        max_history_messages=25,
    )
    assert settings.whatsapp_token == "custom_token"
    assert settings.phone_number_id == "9999"
    assert settings.database_url == "postgresql+asyncpg://user:pass@localhost:5432/bot"
    assert settings.gemini_model == "gemini-2.5-flash"
    assert settings.max_history_messages == 25
