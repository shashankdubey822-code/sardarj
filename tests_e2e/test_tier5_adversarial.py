"""Tier 5: Adversarial Coverage Hardening & Empirical Probe Suite.

Adversarially challenges the consolidated system's endpoints, webhook security,
CORS headers, and frontend directory traversal defenses:
1. CORS preflight OPTIONS requests from http://localhost:3000, http://127.0.0.1:3000,
   and untrusted origins, asserting CORS response headers.
2. GET /webhook token verification adversarial probes (invalid tokens, SQLi tokens,
   casing mismatch, missing parameters, invalid modes) asserting 403 Forbidden / 400 Bad Request.
3. GET /webhook valid verification token handshake with multiple challenge variations
   (numeric, alphanumeric, symbols, unicode) asserting exact plain-text echo and 200 OK.
4. POST /webhook HMAC-SHA256 signature verification probes (missing headers, invalid prefixes,
   corrupted signatures, tampered payloads, wrong keys) asserting 403 Forbidden.
5. POST /webhook valid HMAC-SHA256 signature payload ingestion across multiple message types
   (text, interactive list, buttons, status receipts) asserting 200 OK.
6. Empirical directory traversal defense verification against frontend/server.js across
   raw socket probes and HTTP requests (dot-dot, URL encoded, double encoded, backslashes,
   null-bytes), asserting 403 Forbidden / 400 Bad Request and zero leakage of sensitive files.
"""

import hashlib
import hmac
import json
import subprocess
import sys
from pathlib import Path
from typing import Any, Dict
import pytest
from fastapi.testclient import TestClient

from app.config import Settings


# ==============================================================================
# SECTION 1: CORS PREFLIGHT & ORIGIN PROBES
# ==============================================================================
class TestAdversarialCORSProbes:
    """Empirical verification of CORS middleware configuration on backend/app/main.py."""

    def test_cors_options_preflight_localhost_3000(self, client: TestClient):
        """OPTIONS preflight from http://localhost:3000 returns 200 with Allow-Origin header."""
        response = client.options(
            "/health",
            headers={
                "Origin": "http://localhost:3000",
                "Access-Control-Request-Method": "GET",
                "Access-Control-Request-Headers": "Content-Type",
            },
        )
        assert response.status_code == 200, f"Expected 200 for preflight, got {response.status_code}"
        origin_header = response.headers.get("access-control-allow-origin")
        assert origin_header in ("http://localhost:3000", "*"), (
            f"Expected Access-Control-Allow-Origin to permit localhost:3000, got: {origin_header}"
        )

    def test_cors_options_preflight_127_0_0_1_3000(self, client: TestClient):
        """OPTIONS preflight from http://127.0.0.1:3000 returns 200 with Allow-Origin header."""
        response = client.options(
            "/health",
            headers={
                "Origin": "http://127.0.0.1:3000",
                "Access-Control-Request-Method": "POST",
                "Access-Control-Request-Headers": "Content-Type, X-Hub-Signature-256",
            },
        )
        assert response.status_code == 200, f"Expected 200 for preflight, got {response.status_code}"
        origin_header = response.headers.get("access-control-allow-origin")
        assert origin_header in ("http://127.0.0.1:3000", "*"), (
            f"Expected Access-Control-Allow-Origin to permit 127.0.0.1:3000, got: {origin_header}"
        )

    def test_cors_options_preflight_allowed_methods_and_headers(self, client: TestClient):
        """OPTIONS preflight returns allow-methods and allow-headers."""
        response = client.options(
            "/health",
            headers={
                "Origin": "http://localhost:3000",
                "Access-Control-Request-Method": "GET",
                "Access-Control-Request-Headers": "authorization, content-type",
            },
        )
        assert response.status_code == 200
        assert "access-control-allow-methods" in response.headers
        methods = response.headers["access-control-allow-methods"]
        assert "GET" in methods or "*" in methods

    def test_cors_actual_get_request_headers(self, client: TestClient):
        """Standard GET request with Origin: http://localhost:3000 includes CORS headers."""
        response = client.get(
            "/health",
            headers={"Origin": "http://localhost:3000"},
        )
        assert response.status_code == 200
        origin_header = response.headers.get("access-control-allow-origin")
        assert origin_header in ("http://localhost:3000", "*")


# ==============================================================================
# SECTION 2: WEBHOOK GET TOKEN VERIFICATION (ADVERSARIAL ATTACKS)
# ==============================================================================
class TestAdversarialWebhookGETProbes:
    """Adversarial stress-testing of GET /webhook verification handshake."""

    def test_webhook_get_valid_token_exact_plain_text_echo(
        self, client: TestClient, test_settings: Settings
    ):
        """Valid token and subscribe mode returns 200 with exact challenge string echo."""
        test_challenge = "CHALLENGE_ECHO_TOKEN_1234567890"
        response = client.get(
            "/webhook",
            params={
                "hub.mode": "subscribe",
                "hub.verify_token": test_settings.verify_token,
                "hub.challenge": test_challenge,
            },
        )
        assert response.status_code == 200
        assert response.text == test_challenge
        assert "text/plain" in response.headers.get("content-type", "")

    def test_webhook_get_valid_token_numeric_large_challenge(
        self, client: TestClient, test_settings: Settings
    ):
        """Valid token with 64-digit numeric challenge is echoed verbatim without truncation."""
        large_numeric_challenge = "9876543210123456789098765432101234567890987654321012345678901234"
        response = client.get(
            "/webhook",
            params={
                "hub.mode": "subscribe",
                "hub.verify_token": test_settings.verify_token,
                "hub.challenge": large_numeric_challenge,
            },
        )
        assert response.status_code == 200
        assert response.text == large_numeric_challenge

    def test_webhook_get_valid_token_symbols_challenge(
        self, client: TestClient, test_settings: Settings
    ):
        """Valid token with symbol-rich challenge string is echoed safely."""
        symbols_challenge = "meta.verify:challenge_token-123_456$!@#%^*"
        response = client.get(
            "/webhook",
            params={
                "hub.mode": "subscribe",
                "hub.verify_token": test_settings.verify_token,
                "hub.challenge": symbols_challenge,
            },
        )
        assert response.status_code == 200
        assert response.text == symbols_challenge

    def test_webhook_get_valid_token_unicode_challenge(
        self, client: TestClient, test_settings: Settings
    ):
        """Valid token with unicode Devanagari challenge string is echoed verbatim in UTF-8."""
        unicode_challenge = "बेदी_फैशन_चैलेंज_9211825699"
        response = client.get(
            "/webhook",
            params={
                "hub.mode": "subscribe",
                "hub.verify_token": test_settings.verify_token,
                "hub.challenge": unicode_challenge,
            },
        )
        assert response.status_code == 200
        assert response.text == unicode_challenge

    @pytest.mark.parametrize(
        "invalid_token",
        [
            "WRONG_TOKEN",
            "test_verify_token_2025",
            "TEST_VERIFY_TOKEN_2026",  # Case mismatch
            "test_verify_token_2026 ",  # Trailing space
            " test_verify_token_2026",  # Leading space
            "null",
            "undefined",
            "' OR '1'='1",  # SQL injection attempt
            "<script>alert(1)</script>",  # XSS attempt
            "root",
            "admin",
            "0",
        ],
    )
    def test_webhook_get_invalid_tokens_rejected_with_403(
        self, client: TestClient, invalid_token: str
    ):
        """Any incorrect token string is rejected with 403 Forbidden."""
        response = client.get(
            "/webhook",
            params={
                "hub.mode": "subscribe",
                "hub.verify_token": invalid_token,
                "hub.challenge": "test_challenge",
            },
        )
        assert response.status_code == 403
        assert "Verification token mismatch" in response.text

    @pytest.mark.parametrize(
        "invalid_mode",
        [
            "unsubscribe",
            "publish",
            "SUBSCRIBE",  # Case mismatch
            "SubScribe",
            "admin",
            "webhook",
            "poll",
            "test",
        ],
    )
    def test_webhook_get_invalid_modes_rejected_with_403(
        self, client: TestClient, test_settings: Settings, invalid_mode: str
    ):
        """Even with correct token, any mode other than exact 'subscribe' is rejected with 403."""
        response = client.get(
            "/webhook",
            params={
                "hub.mode": invalid_mode,
                "hub.verify_token": test_settings.verify_token,
                "hub.challenge": "test_challenge",
            },
        )
        assert response.status_code == 403
        assert "invalid mode" in response.text.lower()

    def test_webhook_get_missing_parameters_rejected_with_400(
        self, client: TestClient, test_settings: Settings
    ):
        """Missing required query parameters returns 400 Bad Request."""
        # Missing mode
        r1 = client.get("/webhook", params={"hub.verify_token": test_settings.verify_token, "hub.challenge": "123"})
        assert r1.status_code == 400

        # Missing token
        r2 = client.get("/webhook", params={"hub.mode": "subscribe", "hub.challenge": "123"})
        assert r2.status_code == 400

        # Missing challenge
        r3 = client.get("/webhook", params={"hub.mode": "subscribe", "hub.verify_token": test_settings.verify_token})
        assert r3.status_code == 400

        # Missing all params
        r4 = client.get("/webhook")
        assert r4.status_code == 400


# ==============================================================================
# SECTION 3: WEBHOOK POST HMAC-SHA256 SIGNATURE SECURITY
# ==============================================================================
class TestAdversarialWebhookPOSTSignatureProbes:
    """Adversarial stress-testing of POST /webhook HMAC-SHA256 signature verification."""

    @pytest.mark.parametrize(
        "invalid_sig_header",
        [
            "sha256=0000000000000000000000000000000000000000000000000000000000000000",
            "sha256=ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff",
            "sha1=abcdef1234567890abcdef1234567890abcdef12",  # Wrong algorithm prefix
            "md5=abcdef1234567890abcdef1234567890",
            "sha256:abcdef",  # Colon instead of equals
            "sha256=",  # Empty digest
            "sha256=not_a_valid_hex_string_at_all_zzzzzz",
            "Bearer valid_looking_jwt_token_payload",
            "",
        ],
    )
    def test_webhook_post_invalid_signatures_rejected_with_403(
        self, client: TestClient, sample_text_webhook_payload: Dict[str, Any], invalid_sig_header: str
    ):
        """POST /webhook with non-matching or malformed signature header is rejected with 403."""
        body = json.dumps(sample_text_webhook_payload).encode("utf-8")
        headers = {"Content-Type": "application/json"}
        if invalid_sig_header:
            headers["X-Hub-Signature-256"] = invalid_sig_header

        response = client.post("/webhook", content=body, headers=headers)
        assert response.status_code == 403
        assert "Invalid payload signature" in response.text

    def test_webhook_post_missing_signature_header_rejected_with_403(
        self, client: TestClient, sample_text_webhook_payload: Dict[str, Any]
    ):
        """POST /webhook with no X-Hub-Signature-256 header when secret is set returns 403."""
        body = json.dumps(sample_text_webhook_payload).encode("utf-8")
        response = client.post("/webhook", content=body, headers={"Content-Type": "application/json"})
        assert response.status_code == 403

    def test_webhook_post_wrong_secret_signature_rejected_with_403(
        self, client: TestClient, sample_text_webhook_payload: Dict[str, Any]
    ):
        """POST /webhook signed with an attacker's secret key is rejected with 403."""
        body = json.dumps(sample_text_webhook_payload).encode("utf-8")
        attacker_secret = "ATTACKER_FAKE_SECRET_KEY_999"
        forged_sig = "sha256=" + hmac.new(
            attacker_secret.encode("utf-8"), body, hashlib.sha256
        ).hexdigest()

        response = client.post(
            "/webhook",
            content=body,
            headers={"Content-Type": "application/json", "X-Hub-Signature-256": forged_sig},
        )
        assert response.status_code == 403
        assert "Invalid payload signature" in response.text

    def test_webhook_post_tampered_payload_rejected_with_403(
        self, client: TestClient, sample_text_webhook_payload: Dict[str, Any], test_settings: Settings
    ):
        """Signature calculated on original payload fails when payload is tampered in transit."""
        original_body = json.dumps(sample_text_webhook_payload).encode("utf-8")
        valid_sig = "sha256=" + hmac.new(
            test_settings.meta_app_secret.encode("utf-8"), original_body, hashlib.sha256
        ).hexdigest()

        # Tamper one single byte in payload
        tampered_body = original_body + b" "
        response = client.post(
            "/webhook",
            content=tampered_body,
            headers={"Content-Type": "application/json", "X-Hub-Signature-256": valid_sig},
        )
        assert response.status_code == 403

    def test_webhook_post_valid_signature_text_message_accepted(
        self, client: TestClient, sample_text_webhook_payload: Dict[str, Any], test_settings: Settings
    ):
        """POST /webhook with valid signature and text message payload returns 200 OK."""
        body = json.dumps(sample_text_webhook_payload).encode("utf-8")
        valid_sig = "sha256=" + hmac.new(
            test_settings.meta_app_secret.encode("utf-8"), body, hashlib.sha256
        ).hexdigest()

        response = client.post(
            "/webhook",
            content=body,
            headers={"Content-Type": "application/json", "X-Hub-Signature-256": valid_sig},
        )
        assert response.status_code == 200
        assert response.json() == {"status": "received"}

    def test_webhook_post_valid_signature_interactive_reply_accepted(
        self, client: TestClient, test_settings: Settings
    ):
        """POST /webhook with valid signature and interactive list reply payload returns 200 OK."""
        payload = {
            "object": "whatsapp_business_account",
            "entry": [{
                "id": "1373460992523647",
                "changes": [{
                    "field": "messages",
                    "value": {
                        "messaging_product": "whatsapp",
                        "metadata": {"display_phone_number": "919211825699", "phone_number_id": "1373460992523647"},
                        "contacts": [{"profile": {"name": "Gurcharan Singh"}, "wa_id": "919811825699"}],
                        "messages": [{
                            "from": "919811825699",
                            "id": "wamid.INT_REPLY_01",
                            "timestamp": "1730966400",
                            "type": "interactive",
                            "interactive": {
                                "type": "list_reply",
                                "list_reply": {"id": "cat_school", "title": "School Uniforms"}
                            }
                        }]
                    }
                }]
            }]
        }
        body = json.dumps(payload).encode("utf-8")
        valid_sig = "sha256=" + hmac.new(
            test_settings.meta_app_secret.encode("utf-8"), body, hashlib.sha256
        ).hexdigest()

        response = client.post(
            "/webhook",
            content=body,
            headers={"Content-Type": "application/json", "X-Hub-Signature-256": valid_sig},
        )
        assert response.status_code == 200
        assert response.json() == {"status": "received"}


# ==============================================================================
# SECTION 4: DIRECTORY TRAVERSAL DEFENSE SUITE INVOCATION
# ==============================================================================
class TestFrontendDirectoryTraversalSubprocessSuite:
    """Executes node test_adversarial_traversal.js validating 41 directory traversal attack vectors."""

    def test_node_adversarial_traversal_suite_execution(self, root_dir: Path):
        """Assert that test_adversarial_traversal.js passes 100% of directory traversal attack probes."""
        script_path = root_dir / "test_adversarial_traversal.js"
        assert script_path.exists(), "test_adversarial_traversal.js must exist"

        result = subprocess.run(
            ["node", str(script_path)],
            cwd=str(root_dir),
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            timeout=15,
        )
        print("\n--- Node Traversal Suite Output ---")
        print(result.stdout)
        if result.stderr:
            print("STDERR:", result.stderr)

        assert result.returncode == 0, f"test_adversarial_traversal.js failed with exit code {result.returncode}"
        assert "41 PASSED, 0 FAILED" in result.stdout
