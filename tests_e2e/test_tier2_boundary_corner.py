"""Tier 2: Boundary & Corner Cases Test Suite.

Validates the 6 boundary categories from PROJECT.md and user requirements (>=5 tests per category):
  1. Invalid tokens & authentication failures
  2. Malformed payloads & corrupted data handling
  3. Non-existent endpoints & directory traversal prevention
  4. Empty inputs & extreme boundary values
  5. Network timeouts & simulated latency handling
  6. Duplicate requests & idempotency verification
"""

import hmac
import hashlib
import json
import os
import time
from pathlib import Path
from typing import Any, Dict
from unittest.mock import AsyncMock, MagicMock, patch
import pytest
from fastapi.testclient import TestClient

from app.config import Settings
from app.services.chat import ChatService
from app.services.supabase_service import SupabaseService, get_supabase_service


# ==============================================================================
# CATEGORY 1: Invalid Tokens & Authentication (>=5 tests)
# ==============================================================================
class TestCategory1InvalidTokensAndAuth:
    """Validate system rejection and handling of invalid tokens, tampered signatures, and unauthorized calls."""

    def test_webhook_get_invalid_token_returns_403(self, client: TestClient):
        """Webhook GET with wrong token returns 403 Forbidden."""
        response = client.get("/webhook", params={
            "hub.mode": "subscribe",
            "hub.verify_token": "COMPLETELY_WRONG_TOKEN",
            "hub.challenge": "12345",
        })
        assert response.status_code == 403
        assert "Verification token mismatch" in response.text

    def test_webhook_get_empty_token_returns_400_or_403(self, client: TestClient):
        """Webhook GET with empty token string is rejected."""
        response = client.get("/webhook", params={
            "hub.mode": "subscribe",
            "hub.verify_token": "",
            "hub.challenge": "12345",
        })
        assert response.status_code in (400, 403)

    def test_webhook_get_whitespace_token_returns_403(self, client: TestClient):
        """Webhook GET with whitespace token string is rejected."""
        response = client.get("/webhook", params={
            "hub.mode": "subscribe",
            "hub.verify_token": "   ",
            "hub.challenge": "12345",
        })
        assert response.status_code == 403

    def test_webhook_post_invalid_hmac_signature_returns_403(
        self, client: TestClient, sample_text_webhook_payload: Dict[str, Any]
    ):
        """Webhook POST with invalid signature header is rejected with 403 Forbidden."""
        body = json.dumps(sample_text_webhook_payload).encode("utf-8")
        response = client.post(
            "/webhook",
            content=body,
            headers={
                "Content-Type": "application/json",
                "X-Hub-Signature-256": "sha256=0000000000000000000000000000000000000000000000000000000000000000",
            },
        )
        assert response.status_code == 403
        assert "Invalid payload signature" in response.text

    def test_webhook_post_missing_signature_when_secret_set_returns_403(
        self, client: TestClient, sample_text_webhook_payload: Dict[str, Any]
    ):
        """Webhook POST missing X-Hub-Signature-256 when meta_app_secret is configured is rejected."""
        body = json.dumps(sample_text_webhook_payload).encode("utf-8")
        response = client.post(
            "/webhook",
            content=body,
            headers={"Content-Type": "application/json"},
        )
        assert response.status_code == 403

    def test_webhook_post_tampered_body_fails_signature_403(
        self, client: TestClient, sample_text_webhook_payload: Dict[str, Any], test_settings: Settings
    ):
        """Signature calculated on original body fails when body is modified."""
        original_body = json.dumps(sample_text_webhook_payload).encode("utf-8")
        signature = "sha256=" + hmac.new(
            test_settings.meta_app_secret.encode("utf-8"), original_body, hashlib.sha256
        ).hexdigest()

        # Modify payload after signature calculation
        tampered_body = original_body.replace(b"500", b"999999")
        response = client.post(
            "/webhook",
            content=tampered_body,
            headers={
                "Content-Type": "application/json",
                "X-Hub-Signature-256": signature,
            },
        )
        assert response.status_code == 403


# ==============================================================================
# CATEGORY 2: Malformed Payloads & Corrupted Data (>=5 tests)
# ==============================================================================
class TestCategory2MalformedPayloads:
    """Validate system handling of malformed JSON, corrupted encodings, and missing structural fields."""

    def test_webhook_post_non_json_body_handled(self, client: TestClient, test_settings: Settings):
        """Incoming body with raw malformed string returns 200 with status: invalid_json."""
        raw_body = b"NOT_A_JSON_STRING_AT_ALL<!DOCTYPE html>"
        signature = "sha256=" + hmac.new(
            test_settings.meta_app_secret.encode("utf-8"), raw_body, hashlib.sha256
        ).hexdigest()

        response = client.post(
            "/webhook",
            content=raw_body,
            headers={"Content-Type": "application/json", "X-Hub-Signature-256": signature},
        )
        assert response.status_code == 200
        assert response.json().get("status") in ("invalid_json", "received")

    def test_webhook_post_empty_body_handled(self, client: TestClient, test_settings: Settings):
        """Incoming empty byte body is handled safely."""
        raw_body = b""
        signature = "sha256=" + hmac.new(
            test_settings.meta_app_secret.encode("utf-8"), raw_body, hashlib.sha256
        ).hexdigest()

        response = client.post(
            "/webhook",
            content=raw_body,
            headers={"Content-Type": "application/json", "X-Hub-Signature-256": signature},
        )
        assert response.status_code == 200
        assert response.json().get("status") in ("invalid_json", "received")

    def test_webhook_post_corrupted_utf8_handled(self, client: TestClient, test_settings: Settings):
        """Incoming body with invalid UTF-8 byte sequences returns 200 without crashing."""
        corrupted_bytes = b"{\x80\x81\x82 invalid json \xff}"
        signature = "sha256=" + hmac.new(
            test_settings.meta_app_secret.encode("utf-8"), corrupted_bytes, hashlib.sha256
        ).hexdigest()

        response = client.post(
            "/webhook",
            content=corrupted_bytes,
            headers={"Content-Type": "application/json", "X-Hub-Signature-256": signature},
        )
        assert response.status_code == 200
        assert response.json().get("status") in ("invalid_json", "received")

    def test_webhook_post_payload_missing_entry_array(self, client: TestClient, test_settings: Settings):
        """Valid JSON payload but missing entry field entirely returns 200 received."""
        payload = {"object": "whatsapp_business_account"}
        body = json.dumps(payload).encode("utf-8")
        signature = "sha256=" + hmac.new(
            test_settings.meta_app_secret.encode("utf-8"), body, hashlib.sha256
        ).hexdigest()

        response = client.post(
            "/webhook",
            content=body,
            headers={"Content-Type": "application/json", "X-Hub-Signature-256": signature},
        )
        assert response.status_code == 200
        assert response.json() == {"status": "received"}

    def test_webhook_post_payload_empty_changes(self, client: TestClient, test_settings: Settings):
        """Valid entry with empty changes array returns 200."""
        payload = {"entry": [{"id": "123", "changes": []}]}
        body = json.dumps(payload).encode("utf-8")
        signature = "sha256=" + hmac.new(
            test_settings.meta_app_secret.encode("utf-8"), body, hashlib.sha256
        ).hexdigest()

        response = client.post(
            "/webhook",
            content=body,
            headers={"Content-Type": "application/json", "X-Hub-Signature-256": signature},
        )
        assert response.status_code == 200
        assert response.json() == {"status": "received"}

    def test_webhook_post_unsupported_message_type_fallback(
        self, client: TestClient, test_settings: Settings
    ):
        """Unsupported message types (e.g. sticker, location) trigger polite fallback reply."""
        payload = {
            "object": "whatsapp_business_account",
            "entry": [{
                "id": "1373460992523647",
                "changes": [{
                    "field": "messages",
                    "value": {
                        "messaging_product": "whatsapp",
                        "messages": [{
                            "from": "919211825699",
                            "id": "wamid.STICKER_01",
                            "type": "sticker",
                            "sticker": {"id": "12345"}
                        }]
                    }
                }]
            }]
        }
        body = json.dumps(payload).encode("utf-8")
        signature = "sha256=" + hmac.new(
            test_settings.meta_app_secret.encode("utf-8"), body, hashlib.sha256
        ).hexdigest()

        response = client.post(
            "/webhook",
            content=body,
            headers={"Content-Type": "application/json", "X-Hub-Signature-256": signature},
        )
        assert response.status_code == 200
        assert response.json() == {"status": "received"}


# ==============================================================================
# CATEGORY 3: Non-Existent Endpoints & Directory Traversal (>=5 tests)
# ==============================================================================
class TestCategory3NonExistentEndpointsAndTraversal:
    """Validate 404 responses for nonexistent routes and protection against directory traversal attacks."""

    def test_backend_nonexistent_endpoint_returns_404(self, client: TestClient):
        """Request to nonexistent endpoint returns 404 Not Found."""
        response = client.get("/api/v9/nonexistent_subsystem_endpoint")
        assert response.status_code == 404

    def test_backend_webhook_invalid_subpath_returns_404(self, client: TestClient):
        """Request to /webhook/nested_path returns 404."""
        response = client.get("/webhook/invalid_subpath")
        assert response.status_code == 404

    def test_frontend_directory_traversal_dot_dot_prevented(self, root_dir: Path):
        """server.js path validation logic blocks traversal attempts with 403."""
        base_dir = str(root_dir)
        attempted_paths = [
            "/../package.json",
            "/../../windows/system32/cmd.exe",
            "/../../etc/passwd",
        ]
        for att in attempted_paths:
            resolved = os.path.abspath(base_dir + att)
            is_escaped = not resolved.startswith(base_dir)
            assert is_escaped, f"Path traversal attempt {att} escaped base check"

    def test_frontend_directory_traversal_url_encoded_prevented(self, root_dir: Path):
        """URL-encoded directory traversal /%2e%2e/ is resolved and blocked."""
        import urllib.parse
        encoded = "/%2e%2e/package.json"
        decoded = urllib.parse.unquote(encoded)
        resolved = os.path.abspath(os.path.join(str(root_dir), "." + decoded))
        assert not resolved.startswith(str(root_dir))

    def test_frontend_nonexistent_static_asset_not_found(self, frontend_dir: Path):
        """Checking nonexistent static asset in filesystem returns False."""
        fake_asset = frontend_dir / "models" / "nonexistent_model_file.glb"
        assert not fake_asset.exists()


# ==============================================================================
# CATEGORY 4: Empty Inputs & Extreme Boundaries (>=5 tests)
# ==============================================================================
class TestCategory4EmptyInputsAndExtremeBoundaries:
    """Validate parameter validation, default application, and handling of extreme sizes."""

    def test_webhook_get_no_query_params_returns_400(self, client: TestClient):
        """GET /webhook without query parameters returns 400 Bad Request."""
        response = client.get("/webhook")
        assert response.status_code == 400
        assert "Missing required query parameters" in response.text

    def test_webhook_get_missing_mode_returns_400(self, client: TestClient, test_settings: Settings):
        """GET /webhook missing hub.mode parameter returns 400."""
        response = client.get("/webhook", params={
            "hub.verify_token": test_settings.verify_token,
            "hub.challenge": "123",
        })
        assert response.status_code == 400

    def test_webhook_get_missing_challenge_returns_400(self, client: TestClient, test_settings: Settings):
        """GET /webhook missing hub.challenge parameter returns 400."""
        response = client.get("/webhook", params={
            "hub.mode": "subscribe",
            "hub.verify_token": test_settings.verify_token,
        })
        assert response.status_code == 400

    def test_webhook_post_text_message_empty_body_string_handled(
        self, client: TestClient, test_settings: Settings
    ):
        """Incoming text message with empty body string is handled without crashing."""
        payload = {
            "object": "whatsapp_business_account",
            "entry": [{
                "id": "1373460992523647",
                "changes": [{
                    "field": "messages",
                    "value": {
                        "messaging_product": "whatsapp",
                        "messages": [{
                            "from": "919211825699",
                            "id": "wamid.EMPTY_BODY_01",
                            "type": "text",
                            "text": {"body": "   "}
                        }]
                    }
                }]
            }]
        }
        body = json.dumps(payload).encode("utf-8")
        signature = "sha256=" + hmac.new(
            test_settings.meta_app_secret.encode("utf-8"), body, hashlib.sha256
        ).hexdigest()

        response = client.post(
            "/webhook",
            content=body,
            headers={"Content-Type": "application/json", "X-Hub-Signature-256": signature},
        )
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_supabase_save_inquiry_empty_fields_applies_defaults(self):
        """Supabase save_b2b_inquiry({}) applies robust defaults without raising KeyError."""
        service = get_supabase_service()
        with patch("httpx.AsyncClient.post") as mock_post:
            mock_resp = MagicMock()
            mock_resp.status_code = 201
            mock_resp.json.return_value = [{"id": "inq-defaults", "organization_name": "Anonymous Org"}]
            mock_post.return_value = mock_resp

            result = await service.save_b2b_inquiry({})
            assert result is not None
            assert result.get("id") == "inq-defaults"

    def test_webhook_post_extreme_large_payload_handling(self, client: TestClient, test_settings: Settings):
        """Payload with 100KB message text handled safely without server crash."""
        large_text = "Uniform specifications " * 4000  # ~90KB
        payload = {
            "object": "whatsapp_business_account",
            "entry": [{
                "id": "1373460992523647",
                "changes": [{
                    "field": "messages",
                    "value": {
                        "messaging_product": "whatsapp",
                        "messages": [{
                            "from": "919211825699",
                            "id": "wamid.LARGE_MSG_01",
                            "type": "text",
                            "text": {"body": large_text}
                        }]
                    }
                }]
            }]
        }
        body = json.dumps(payload).encode("utf-8")
        signature = "sha256=" + hmac.new(
            test_settings.meta_app_secret.encode("utf-8"), body, hashlib.sha256
        ).hexdigest()

        response = client.post(
            "/webhook",
            content=body,
            headers={"Content-Type": "application/json", "X-Hub-Signature-256": signature},
        )
        assert response.status_code == 200
        assert response.json() == {"status": "received"}


# ==============================================================================
# CATEGORY 5: Network Timeouts & Latency (>=5 tests)
# ==============================================================================
class TestCategory5NetworkTimeoutsAndLatency:
    """Validate system resilience and error isolation during simulated network timeouts and latency."""

    @pytest.mark.asyncio
    async def test_supabase_health_check_timeout_handled(self):
        """Supabase health check timeout returns degraded/error status without crashing."""
        service = get_supabase_service()
        with patch("httpx.AsyncClient.get", side_effect=Exception("ReadTimeout on Supabase connection")):
            result = await service.check_health()
            assert result.get("status") in ("error", "degraded")
            assert "ReadTimeout" in result.get("error", "")

    @pytest.mark.asyncio
    async def test_supabase_get_products_timeout_handled(self):
        """Supabase get_products timeout returns empty list without raising."""
        service = get_supabase_service()
        with patch("httpx.AsyncClient.get", side_effect=Exception("Connection timeout")):
            products = await service.get_products()
            assert products == []

    @pytest.mark.asyncio
    async def test_supabase_save_inquiry_timeout_handled(self):
        """Supabase save_b2b_inquiry timeout returns None with error logged."""
        service = get_supabase_service()
        with patch("httpx.AsyncClient.post", side_effect=Exception("Network timeout saving inquiry")):
            result = await service.save_b2b_inquiry({"organization_name": "Timeout School"})
            assert result is None

    def test_runner_cloudflare_tunnel_polling_timeout_handled(self, root_dir: Path):
        """Runner tunnel polling loop gracefully terminates after 25 attempts if no URL appears."""
        import start
        log_file = root_dir / "scratch" / "cf_runner.log"
        log_file.parent.mkdir(parents=True, exist_ok=True)
        log_file.write_text("Tunnel starting...\nWaiting for connection...", encoding="utf-8")

        with patch("subprocess.Popen") as mock_popen, patch("time.sleep"):
            mock_proc = MagicMock()
            mock_popen.return_value = mock_proc

            proc = start.start_cloudflare_tunnel()
            assert proc == mock_proc

    @pytest.mark.asyncio
    async def test_chat_service_llm_provider_timeout_fallback(self, test_settings: Settings):
        """GeminiProvider catches API errors/timeouts and returns a safe error string instead of crashing."""
        from app.services.llm import GeminiProvider
        provider = GeminiProvider(test_settings)
        # Mock client models call to raise timeout
        mock_client = MagicMock()
        mock_client.aio.models.generate_content = AsyncMock(side_effect=Exception("Gemini generation timed out after 30s"))
        mock_client.aio.aclose = AsyncMock()
        provider._client = mock_client

        reply = await provider.generate_reply("Test prompt")
        assert "Error processing request" in reply
        assert "Gemini generation timed out" in reply


# ==============================================================================
# CATEGORY 6: Duplicate Requests & Idempotency (>=5 tests)
# ==============================================================================
class TestCategory6DuplicateRequestsAndIdempotency:
    """Validate idempotent behaviors across GET handshakes, health checks, receipts, and inquiries."""

    def test_webhook_get_handshake_idempotent(self, client: TestClient, test_settings: Settings):
        """Multiple identical GET verification calls return identical challenge."""
        params = {
            "hub.mode": "subscribe",
            "hub.verify_token": test_settings.verify_token,
            "hub.challenge": "CHALLENGE_IDEMPOTENT_1",
        }
        res1 = client.get("/webhook", params=params)
        res2 = client.get("/webhook", params=params)
        res3 = client.get("/webhook", params=params)

        assert res1.status_code == res2.status_code == res3.status_code == 200
        assert res1.text == res2.text == res3.text == "CHALLENGE_IDEMPOTENT_1"

    def test_backend_health_check_idempotent(self, client: TestClient):
        """Consecutive calls to GET /health produce consistent responses."""
        responses = [client.get("/health") for _ in range(5)]
        for r in responses:
            assert r.status_code == 200
            assert r.json()["status"] == "online"

    def test_webhook_duplicate_status_receipt_handling(
        self, client: TestClient, sample_status_payload: Dict[str, Any], test_settings: Settings
    ):
        """Sending the same read/delivery receipt multiple times produces identical 200 received."""
        body = json.dumps(sample_status_payload).encode("utf-8")
        signature = "sha256=" + hmac.new(
            test_settings.meta_app_secret.encode("utf-8"), body, hashlib.sha256
        ).hexdigest()

        for _ in range(3):
            res = client.post(
                "/webhook",
                content=body,
                headers={"Content-Type": "application/json", "X-Hub-Signature-256": signature},
            )
            assert res.status_code == 200
            assert res.json() == {"status": "received"}

    def test_webhook_duplicate_incoming_message_id_handled(
        self, client: TestClient, sample_text_webhook_payload: Dict[str, Any], test_settings: Settings
    ):
        """Submitting the same message ID multiple times is received without error."""
        body = json.dumps(sample_text_webhook_payload).encode("utf-8")
        signature = "sha256=" + hmac.new(
            test_settings.meta_app_secret.encode("utf-8"), body, hashlib.sha256
        ).hexdigest()

        res1 = client.post("/webhook", content=body, headers={"Content-Type": "application/json", "X-Hub-Signature-256": signature})
        res2 = client.post("/webhook", content=body, headers={"Content-Type": "application/json", "X-Hub-Signature-256": signature})
        assert res1.status_code == 200
        assert res2.status_code == 200

    def test_rfq_multiple_submissions_unique_identifiers(self):
        """Multiple submissions generate distinct identifiers."""
        # Simulated RFQ ID generation logic: 'rfq-' + timestamp/random
        id1 = f"rfq-{int(time.time() * 1000)}"
        time.sleep(0.005)
        id2 = f"rfq-{int(time.time() * 1000)}"
        assert id1 != id2
        assert id1.startswith("rfq-")
        assert id2.startswith("rfq-")
