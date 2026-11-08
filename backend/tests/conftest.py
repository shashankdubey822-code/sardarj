"""Pytest fixtures and test environment configuration."""

from typing import Any, Dict, Generator, List, Optional, Tuple
import pytest
from fastapi.testclient import TestClient

from app.config import Settings, get_settings
from app.db.session import init_db
from app.main import create_app
from app.services.chat import ChatService, get_chat_service
from app.services.llm import LLMProvider
from app.services.whatsapp import WhatsAppService


class MockLLMProvider(LLMProvider):
    """Mock LLM Provider for offline deterministic tests."""

    def __init__(self, reply: str = "Test AI response") -> None:
        self.reply = reply
        self.prompts: List[str] = []
        self.system_prompts: List[Optional[str]] = []

    async def generate_reply(self, prompt: str, system_prompt: Optional[str] = None) -> str:
        self.prompts.append(prompt)
        self.system_prompts.append(system_prompt)
        return self.reply


class MockWhatsAppService(WhatsAppService):
    """Mock WhatsApp Service for offline deterministic tests."""

    def __init__(self) -> None:
        self.sent_messages: List[Tuple[str, str]] = []
        self.read_message_ids: List[str] = []
        self.sent_interactive_lists: List[Dict[str, Any]] = []

    async def send_text(self, to_number: str, message: str) -> bool:
        self.sent_messages.append((to_number, message))
        return True

    async def send_interactive_list(
        self,
        to_number: str,
        body_text: str,
        button_label: str,
        sections: List[Dict[str, Any]],
        header_text: Optional[str] = None,
        footer_text: Optional[str] = None,
    ) -> bool:
        self.sent_interactive_lists.append({
            "to": to_number,
            "body": body_text,
            "button": button_label,
            "sections": sections,
            "header": header_text,
            "footer": footer_text,
        })
        return True

    async def mark_as_read(self, message_id: str) -> bool:
        self.read_message_ids.append(message_id)
        return True


@pytest.fixture
def test_settings() -> Settings:
    """Fixture providing predictable settings for unit tests."""
    return Settings(
        whatsapp_token="test_whatsapp_token_secret_value",
        phone_number_id="1234567890",
        verify_token="test_verification_secret_token",
        meta_app_secret="test_meta_app_secret_key",
        gemini_api_key="test_gemini_api_key_secret",
        gemini_model="gemini-3.5-flash-lite",
        database_url="sqlite+aiosqlite:///:memory:",
        graph_api_version="v25.0",
        log_level="DEBUG",
        max_history_messages=12,
    )


@pytest.fixture
def mock_whatsapp() -> MockWhatsAppService:
    """Fixture providing mock WhatsApp client."""
    return MockWhatsAppService()


@pytest.fixture
def mock_llm() -> MockLLMProvider:
    """Fixture providing mock LLM client."""
    return MockLLMProvider()


@pytest.fixture
def mock_chat_service(
    test_settings: Settings,
    mock_llm: MockLLMProvider,
    mock_whatsapp: MockWhatsAppService,
) -> ChatService:
    """Fixture providing mock chat service."""
    return ChatService(
        llm_provider=mock_llm,
        whatsapp_service=mock_whatsapp,
        settings=test_settings,
    )


@pytest.fixture
def client(
    test_settings: Settings,
    mock_chat_service: ChatService,
) -> Generator[TestClient, None, None]:
    """Fixture providing a TestClient with overridden test settings and mock services."""
    app = create_app()
    app.dependency_overrides[get_settings] = lambda: test_settings
    app.dependency_overrides[get_chat_service] = lambda: mock_chat_service

    with TestClient(app) as test_client:
        yield test_client

    app.dependency_overrides.clear()
