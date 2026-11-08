"""Tests for Meta WhatsApp webhook endpoints."""

import hashlib
import hmac
import json
from fastapi.testclient import TestClient

from app.config import Settings, get_settings
from app.main import create_app
from app.services.chat import ChatService
from tests.conftest import MockLLMProvider, MockWhatsAppService


def _compute_meta_signature(secret: str, payload_bytes: bytes) -> str:
    """Helper to generate X-Hub-Signature-256 header."""
    sig = hmac.new(secret.encode("utf-8"), payload_bytes, hashlib.sha256).hexdigest()
    return f"sha256={sig}"


def test_health_check(client: TestClient) -> None:
    """Test health check and chat redirect endpoints."""
    health_resp = client.get("/health")
    assert health_resp.status_code == 200
    data = health_resp.json()
    assert data["status"] == "online"
    assert "WhatsApp" in data["service"]

    # Test / and /chat redirection
    redirect_resp = client.get("/chat")
    assert redirect_resp.status_code == 200
    assert "wa.me" in redirect_resp.text


def test_webhook_verify_success(client: TestClient, test_settings: Settings) -> None:
    """Test successful Meta webhook handshake."""
    params = {
        "hub.mode": "subscribe",
        "hub.verify_token": test_settings.verify_token,
        "hub.challenge": "test_challenge_12345",
    }
    response = client.get("/webhook", params=params)
    assert response.status_code == 200
    assert response.text == "test_challenge_12345"
    assert response.headers["content-type"].startswith("text/plain")


def test_webhook_verify_wrong_token(client: TestClient) -> None:
    """Test webhook verification failure with invalid token."""
    params = {
        "hub.mode": "subscribe",
        "hub.verify_token": "invalid_token_xyz",
        "hub.challenge": "test_challenge_12345",
    }
    response = client.get("/webhook", params=params)
    assert response.status_code == 403
    assert "Verification token mismatch" in response.json()["detail"]


def test_webhook_verify_wrong_mode(client: TestClient, test_settings: Settings) -> None:
    """Test webhook verification failure with unexpected mode."""
    params = {
        "hub.mode": "unsubscribe",
        "hub.verify_token": test_settings.verify_token,
        "hub.challenge": "test_challenge_12345",
    }
    response = client.get("/webhook", params=params)
    assert response.status_code == 403


def test_webhook_verify_missing_params(client: TestClient) -> None:
    """Test webhook verification failure with missing parameters."""
    response = client.get("/webhook", params={"hub.mode": "subscribe"})
    assert response.status_code == 400
    assert "Missing required query parameters" in response.json()["detail"]


def test_webhook_post_with_valid_signature(
    client: TestClient,
    test_settings: Settings,
    mock_chat_service: ChatService,
) -> None:
    """Test incoming webhook POST with valid HMAC-SHA256 signature dispatches message."""
    payload = {
        "object": "whatsapp_business_account",
        "entry": [
            {
                "id": "123456",
                "changes": [
                    {
                        "value": {
                            "messaging_product": "whatsapp",
                            "messages": [
                                {
                                    "from": "1234567890",
                                    "id": "wamid.msg1",
                                    "type": "text",
                                    "text": {"body": "Do you provide custom embroidery?"},
                                }
                            ],
                        },
                        "field": "messages",
                    }
                ],
            }
        ],
    }
    payload_bytes = json.dumps(payload).encode("utf-8")
    sig_header = _compute_meta_signature(test_settings.meta_app_secret, payload_bytes)

    response = client.post(
        "/webhook",
        content=payload_bytes,
        headers={"Content-Type": "application/json", "X-Hub-Signature-256": sig_header},
    )
    assert response.status_code == 200
    assert response.json() == {"status": "received"}

    # Verify background execution of chat_service
    wa_service = mock_chat_service.whatsapp
    assert isinstance(wa_service, MockWhatsAppService)
    assert ("1234567890", "Test AI response") in wa_service.sent_messages
    assert "wamid.msg1" in wa_service.read_message_ids


def test_webhook_post_non_text_message(
    client: TestClient,
    test_settings: Settings,
    mock_chat_service: ChatService,
) -> None:
    """Test incoming non-text webhook message sends unsupported notification."""
    payload = {
        "object": "whatsapp_business_account",
        "entry": [
            {
                "id": "123456",
                "changes": [
                    {
                        "value": {
                            "messaging_product": "whatsapp",
                            "messages": [
                                {
                                    "from": "9876543210",
                                    "id": "wamid.image1",
                                    "type": "image",
                                    "image": {"id": "img123"},
                                }
                            ],
                        },
                        "field": "messages",
                    }
                ],
            }
        ],
    }
    payload_bytes = json.dumps(payload).encode("utf-8")
    sig_header = _compute_meta_signature(test_settings.meta_app_secret, payload_bytes)

    response = client.post(
        "/webhook",
        content=payload_bytes,
        headers={"Content-Type": "application/json", "X-Hub-Signature-256": sig_header},
    )
    assert response.status_code == 200
    assert response.json() == {"status": "received"}

    wa_service = mock_chat_service.whatsapp
    assert isinstance(wa_service, MockWhatsAppService)
    assert any("only understand text messages" in msg[1] for msg in wa_service.sent_messages)


def test_webhook_post_interactive_list_reply(
    client: TestClient,
    test_settings: Settings,
    mock_chat_service: ChatService,
) -> None:
    """Test incoming interactive list reply message triggers chat processing."""
    payload = {
        "object": "whatsapp_business_account",
        "entry": [
            {
                "id": "123456",
                "changes": [
                    {
                        "value": {
                            "messaging_product": "whatsapp",
                            "messages": [
                                {
                                    "from": "1234567890",
                                    "id": "wamid.interactive1",
                                    "type": "interactive",
                                    "interactive": {
                                        "type": "list_reply",
                                        "list_reply": {
                                            "id": "cat_belt",
                                            "title": "School Belts",
                                            "description": "Sizes S, M, L",
                                        },
                                    },
                                }
                            ],
                        },
                        "field": "messages",
                    }
                ],
            }
        ],
    }
    payload_bytes = json.dumps(payload).encode("utf-8")
    sig_header = _compute_meta_signature(test_settings.meta_app_secret, payload_bytes)

    response = client.post(
        "/webhook",
        content=payload_bytes,
        headers={"Content-Type": "application/json", "X-Hub-Signature-256": sig_header},
    )
    assert response.status_code == 200
    assert response.json() == {"status": "received"}

    wa_service = mock_chat_service.whatsapp
    assert isinstance(wa_service, MockWhatsAppService)
    assert len(wa_service.sent_interactive_lists) >= 1


def test_webhook_post_status_receipt(
    client: TestClient,
    test_settings: Settings,
) -> None:
    """Test incoming delivery/read status updates are safely ignored without error."""
    payload = {
        "object": "whatsapp_business_account",
        "entry": [
            {
                "id": "123456",
                "changes": [
                    {
                        "value": {
                            "messaging_product": "whatsapp",
                            "statuses": [
                                {
                                    "id": "wamid.receipt1",
                                    "recipient_id": "1234567890",
                                    "status": "delivered",
                                }
                            ],
                        },
                        "field": "messages",
                    }
                ],
            }
        ],
    }
    payload_bytes = json.dumps(payload).encode("utf-8")
    sig_header = _compute_meta_signature(test_settings.meta_app_secret, payload_bytes)

    response = client.post(
        "/webhook",
        content=payload_bytes,
        headers={"Content-Type": "application/json", "X-Hub-Signature-256": sig_header},
    )
    assert response.status_code == 200
    assert response.json() == {"status": "received"}


def test_webhook_post_case_insensitive_signature(
    client: TestClient,
    test_settings: Settings,
) -> None:
    """Test incoming webhook accepts uppercase SHA256= prefix and hex."""
    payload_bytes = b'{"object": "whatsapp_business_account"}'
    sig = hmac.new(test_settings.meta_app_secret.encode("utf-8"), payload_bytes, hashlib.sha256).hexdigest().upper()
    sig_header = f"SHA256={sig}"

    response = client.post(
        "/webhook",
        content=payload_bytes,
        headers={"Content-Type": "application/json", "X-Hub-Signature-256": sig_header},
    )
    assert response.status_code == 200
    assert response.json() == {"status": "received"}


def test_webhook_post_with_invalid_signature(client: TestClient) -> None:
    """Test incoming webhook POST rejected with invalid signature."""
    payload_bytes = b'{"object": "whatsapp_business_account"}'
    response = client.post(
        "/webhook",
        content=payload_bytes,
        headers={
            "Content-Type": "application/json",
            "X-Hub-Signature-256": "sha256=invalidhexsignature00000000000000000000000000000000000000000000",
        },
    )
    assert response.status_code == 403
    assert "Invalid payload signature" in response.json()["detail"]


def test_webhook_post_missing_signature_when_secret_configured(client: TestClient) -> None:
    """Test incoming webhook POST rejected when secret is configured but header is omitted."""
    payload_bytes = b'{"object": "whatsapp_business_account"}'
    response = client.post(
        "/webhook",
        content=payload_bytes,
        headers={"Content-Type": "application/json"},
    )
    assert response.status_code == 403


def test_webhook_post_without_secret_configured() -> None:
    """Test incoming webhook POST accepted when no app secret is configured (dev mode)."""
    app = create_app()
    custom_settings = Settings(meta_app_secret="", verify_token="token123")
    app.dependency_overrides[get_settings] = lambda: custom_settings

    with TestClient(app) as local_client:
        payload_bytes = b'{"test": "data"}'
        response = local_client.post(
            "/webhook",
            content=payload_bytes,
            headers={"Content-Type": "application/json"},
        )
        assert response.status_code == 200
        assert response.json() == {"status": "received"}


def test_webhook_post_invalid_json(client: TestClient, test_settings: Settings) -> None:
    """Test incoming webhook gracefully handles malformed JSON without crashing."""
    malformed_body = b"not a json string"
    sig_header = _compute_meta_signature(test_settings.meta_app_secret, malformed_body)

    response = client.post(
        "/webhook",
        content=malformed_body,
        headers={"Content-Type": "application/json", "X-Hub-Signature-256": sig_header},
    )
    assert response.status_code == 200
    assert response.json() == {"status": "invalid_json"}
