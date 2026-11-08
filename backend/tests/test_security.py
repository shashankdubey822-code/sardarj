"""Unit tests for cryptographic security utilities."""

import hashlib
import hmac
from app.core.security import verify_payload_signature, verify_webhook_token


def test_verify_webhook_token_valid() -> None:
    """Test token verification with matching values and mode."""
    assert verify_webhook_token("subscribe", "my_secret_token", "my_secret_token") is True


def test_verify_webhook_token_mismatch() -> None:
    """Test token verification failure when tokens differ."""
    assert verify_webhook_token("subscribe", "wrong_token", "my_secret_token") is False


def test_verify_webhook_token_invalid_mode() -> None:
    """Test token verification failure when mode is not subscribe."""
    assert verify_webhook_token("publish", "my_secret_token", "my_secret_token") is False


def test_verify_webhook_token_none_values() -> None:
    """Test token verification handles None arguments safely."""
    assert verify_webhook_token(None, "token", "token") is False
    assert verify_webhook_token("subscribe", None, "token") is False
    assert verify_webhook_token("subscribe", "token", "") is False


def test_verify_payload_signature_valid() -> None:
    """Test signature verification with correct HMAC-SHA256."""
    secret = "app_secret_12345"
    payload = b'{"event": "message_received"}'
    expected_hex = hmac.new(secret.encode("utf-8"), payload, hashlib.sha256).hexdigest()
    header = f"sha256={expected_hex}"

    assert verify_payload_signature(payload, header, secret) is True


def test_verify_payload_signature_tampered_payload() -> None:
    """Test signature verification rejects tampered payload."""
    secret = "app_secret_12345"
    payload = b'{"event": "message_received"}'
    tampered_payload = b'{"event": "message_tampered"}'
    expected_hex = hmac.new(secret.encode("utf-8"), payload, hashlib.sha256).hexdigest()
    header = f"sha256={expected_hex}"

    assert verify_payload_signature(tampered_payload, header, secret) is False


def test_verify_payload_signature_malformed_header() -> None:
    """Test signature verification rejects headers without sha256= prefix."""
    secret = "app_secret_12345"
    payload = b"test"
    assert verify_payload_signature(payload, "invalid_header", secret) is False
    assert verify_payload_signature(payload, None, secret) is False


def test_verify_payload_signature_empty_secret() -> None:
    """Test signature verification passes when secret is empty (development mode)."""
    assert verify_payload_signature(b"test", "sha256=anything", "") is True
