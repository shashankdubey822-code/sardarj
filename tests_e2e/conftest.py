"""Global fixtures and test configuration for E2E 4-Tier Test Suite."""

import os
import sys
from pathlib import Path
from typing import Any, Dict, Generator, List, Optional, Tuple
import pytest
from dotenv import load_dotenv

# Ensure root and backend directories are in sys.path
ROOT_DIR = Path(__file__).resolve().parent.parent
BACKEND_DIR = ROOT_DIR / "backend"

if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

# Load root environment
load_dotenv(ROOT_DIR / ".env")

from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.config import Settings, get_settings
from app.db.session import init_db
from app.main import create_app
from app.services.chat import ChatService, get_chat_service
from app.services.llm import LLMProvider
from app.services.whatsapp import WhatsAppService
from app.services.supabase_service import SupabaseService, get_supabase_service


class MockLLMProvider(LLMProvider):
    """Deterministic Mock LLM Provider for offline E2E verification."""

    def __init__(self, reply: str = "Welcome to Bedi Fashion. We manufacture premium uniforms.") -> None:
        self.reply = reply
        self.prompts: List[str] = []
        self.system_prompts: List[Optional[str]] = []

    async def generate_reply(self, prompt: str, system_prompt: Optional[str] = None) -> str:
        self.prompts.append(prompt)
        self.system_prompts.append(system_prompt)
        return self.reply


class MockWhatsAppService(WhatsAppService):
    """Deterministic Mock WhatsApp Service for capturing outgoing API calls."""

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


@pytest.fixture(scope="session")
def root_dir() -> Path:
    """Return root repository path."""
    return ROOT_DIR


@pytest.fixture(scope="session")
def frontend_dir(root_dir: Path) -> Path:
    """Return frontend directory path."""
    return root_dir / "frontend"


@pytest.fixture
def mock_llm() -> MockLLMProvider:
    """Return mock LLM provider."""
    return MockLLMProvider()


@pytest.fixture
def mock_whatsapp() -> MockWhatsAppService:
    """Return mock WhatsApp service."""
    return MockWhatsAppService()


@pytest.fixture
def chat_service(mock_llm: MockLLMProvider, mock_whatsapp: MockWhatsAppService, test_settings: Settings) -> ChatService:
    """Return ChatService initialized with mock providers."""
    return ChatService(llm_provider=mock_llm, whatsapp_service=mock_whatsapp, settings=test_settings)


@pytest.fixture
def test_settings() -> Settings:
    """Provide isolated Settings instance for testing."""
    return Settings(
        whatsapp_token="EABB_TEST_TOKEN_XYZ",
        phone_number_id="1373460992523647",
        verify_token="test_verify_token_2026",
        meta_app_secret="test_app_secret_12345",
        gemini_api_key="test_gemini_key",
        gemini_model="gemini-3.5-flash-lite",
        log_level="DEBUG",
        supabase_url="https://ovdvycumqsjgvlsickjy.supabase.co",
        supabase_project_ref="ovdvycumqsjgvlsickjy",
        supabase_service_role_key="test_service_role_key"
    )


@pytest.fixture
def app(test_settings: Settings, chat_service: ChatService) -> FastAPI:
    """Create test FastAPI application with mocked dependencies."""
    application = create_app()
    application.dependency_overrides[get_settings] = lambda: test_settings
    application.dependency_overrides[get_chat_service] = lambda: chat_service
    return application


@pytest.fixture
def client(app: FastAPI) -> Generator[TestClient, None, None]:
    """Provide TestClient instance for API route testing."""
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture
def sample_text_webhook_payload() -> Dict[str, Any]:
    """Standard Meta WhatsApp text message webhook payload."""
    return {
        "object": "whatsapp_business_account",
        "entry": [
            {
                "id": "1373460992523647",
                "changes": [
                    {
                        "field": "messages",
                        "value": {
                            "messaging_product": "whatsapp",
                            "metadata": {
                                "display_phone_number": "919211825699",
                                "phone_number_id": "1373460992523647"
                            },
                            "contacts": [
                                {
                                    "profile": {"name": "Gurcharan Singh"},
                                    "wa_id": "919811825699"
                                }
                            ],
                            "messages": [
                                {
                                    "from": "919811825699",
                                    "id": "wamid.HBgMOTE5ODExODI1Njk5FQIAEhggM0E0QTY2RjcwQzg2MTgwQkMzRDc5RjYxMkExQkM2QTkA",
                                    "timestamp": "1731000000",
                                    "type": "text",
                                    "text": {
                                        "body": "Hi, I need quotation for 500 school uniform blazers."
                                    }
                                }
                            ]
                        }
                    }
                ]
            }
        ]
    }


@pytest.fixture
def sample_interactive_list_payload() -> Dict[str, Any]:
    """Meta WhatsApp interactive list reply webhook payload."""
    return {
        "object": "whatsapp_business_account",
        "entry": [
            {
                "id": "1373460992523647",
                "changes": [
                    {
                        "field": "messages",
                        "value": {
                            "messaging_product": "whatsapp",
                            "metadata": {
                                "display_phone_number": "919211825699",
                                "phone_number_id": "1373460992523647"
                            },
                            "contacts": [
                                {
                                    "profile": {"name": "School Principal"},
                                    "wa_id": "919899114052"
                                }
                            ],
                            "messages": [
                                {
                                    "from": "919899114052",
                                    "id": "wamid.HBgMOTE5ODk5MTE0MDUyFQIAEhggQzg1Njk1Qzk3QUU2MzJDRDYzRUU4Q0U1QUJFMzIxMkEA",
                                    "timestamp": "1731000050",
                                    "type": "interactive",
                                    "interactive": {
                                        "type": "list_reply",
                                        "list_reply": {
                                            "id": "menu_school_uniforms",
                                            "title": "School Uniforms",
                                            "description": "View catalog for 10 school uniform items"
                                        }
                                    }
                                }
                            ]
                        }
                    }
                ]
            }
        ]
    }


@pytest.fixture
def sample_interactive_button_payload() -> Dict[str, Any]:
    """Meta WhatsApp interactive button reply webhook payload."""
    return {
        "object": "whatsapp_business_account",
        "entry": [
            {
                "id": "1373460992523647",
                "changes": [
                    {
                        "field": "messages",
                        "value": {
                            "messaging_product": "whatsapp",
                            "metadata": {
                                "display_phone_number": "919211825699",
                                "phone_number_id": "1373460992523647"
                            },
                            "messages": [
                                {
                                    "from": "919899114052",
                                    "id": "wamid.BUTTON_REPLY_123",
                                    "timestamp": "1731000080",
                                    "type": "interactive",
                                    "interactive": {
                                        "type": "button_reply",
                                        "button_reply": {
                                            "id": "btn_request_sample",
                                            "title": "Request Free Samples"
                                        }
                                    }
                                }
                            ]
                        }
                    }
                ]
            }
        ]
    }


@pytest.fixture
def sample_status_payload() -> Dict[str, Any]:
    """Meta WhatsApp delivery/read status receipt payload."""
    return {
        "object": "whatsapp_business_account",
        "entry": [
            {
                "id": "1373460992523647",
                "changes": [
                    {
                        "field": "messages",
                        "value": {
                            "messaging_product": "whatsapp",
                            "metadata": {
                                "display_phone_number": "919211825699",
                                "phone_number_id": "1373460992523647"
                            },
                            "statuses": [
                                {
                                    "id": "wamid.HBgMOTE5ODExODI1Njk5FQIAEhggM0E0QTY2RjcwQzg2MTgwQkMzRDc5RjYxMkExQkM2QTkA",
                                    "status": "delivered",
                                    "timestamp": "1731000010",
                                    "recipient_id": "919811825699"
                                }
                            ]
                        }
                    }
                ]
            }
        ]
    }
