"""Cryptographic security utilities for webhook verification and signature validation."""

import hashlib
import hmac
from typing import Optional


def verify_webhook_token(
    mode: Optional[str],
    provided_token: Optional[str],
    expected_token: str,
) -> bool:
    """Verify Meta webhook handshake tokens using constant-time comparison.

    Args:
        mode: The hub.mode query parameter from Meta (should be 'subscribe').
        provided_token: The hub.verify_token query parameter sent by Meta.
        expected_token: The configured verification token in application settings.

    Returns:
        bool: True if mode is 'subscribe' and token matches expected_token; False otherwise.
    """
    if not mode or not provided_token or not expected_token:
        return False

    if mode != "subscribe":
        return False

    return hmac.compare_digest(provided_token, expected_token)


def verify_payload_signature(
    payload: bytes,
    signature_header: Optional[str],
    app_secret: str,
) -> bool:
    """Verify the X-Hub-Signature-256 header sent by Meta using HMAC-SHA256.

    Args:
        payload: Raw request body bytes.
        signature_header: The 'X-Hub-Signature-256' header value (e.g., 'sha256=abcdef...').
        app_secret: The Meta App Secret configured for the webhook application.

    Returns:
        bool: True if signature is valid; False otherwise.
    """
    if not app_secret:
        # If no secret is configured, bypass or reject depending on strictness.
        # When app_secret is not provided, verification cannot occur.
        return True

    if not signature_header:
        return False

    # Meta sends header as 'sha256=<hex_digest>'
    sig_header = signature_header.strip()
    prefix = "sha256="
    if not sig_header.lower().startswith(prefix):
        return False

    provided_signature = sig_header[len(prefix):].strip().lower()

    expected_signature = hmac.new(
        key=app_secret.encode("utf-8"),
        msg=payload,
        digestmod=hashlib.sha256,
    ).hexdigest().lower()

    return hmac.compare_digest(provided_signature, expected_signature)
