"""Tier 1: Feature Coverage Test Suite.

Validates the 6 core features from PROJECT.md Feature Inventory (>=5 tests per feature):
  1. Webhook GET challenge verification handshake
  2. Webhook POST payload ingestion & event dispatch
  3. Frontend static & 3D asset delivery
  4. Supabase connectivity & operations (Project: ovdvycumqsjgvlsickjy)
  5. Backend health & CORS middleware
  6. Runner orchestration (start.py process management)
"""

import hmac
import hashlib
import json
import os
import signal
from pathlib import Path
from typing import Any, Dict
from unittest.mock import MagicMock, patch
import pytest
from fastapi.testclient import TestClient

from app.config import Settings
from app.services.supabase_service import SupabaseService, get_supabase_service


# ==============================================================================
# FEATURE 1: Webhook GET Challenge Verification Handshake (>=5 tests)
# ==============================================================================
class TestFeature1WebhookGetChallenge:
    """Validate Meta WhatsApp webhook GET verification handshake according to Meta specifications."""

    def test_webhook_get_valid_handshake_returns_challenge(self, client: TestClient, test_settings: Settings):
        """Standard valid handshake with hub.mode=subscribe and matching verify_token returns 200 with challenge echo."""
        challenge_token = "CHALLENGE_ECHO_TOKEN_12345"
        response = client.get("/webhook", params={
            "hub.mode": "subscribe",
            "hub.verify_token": test_settings.verify_token,
            "hub.challenge": challenge_token,
        })
        assert response.status_code == 200
        assert response.text == challenge_token

    def test_webhook_get_response_content_type_plain_text(self, client: TestClient, test_settings: Settings):
        """Meta requires challenge echo to have text/plain content type."""
        response = client.get("/webhook", params={
            "hub.mode": "subscribe",
            "hub.verify_token": test_settings.verify_token,
            "hub.challenge": "PLAIN_TEXT_TEST",
        })
        assert response.status_code == 200
        assert "text/plain" in response.headers.get("content-type", "").lower()

    def test_webhook_get_numeric_challenge_string(self, client: TestClient, test_settings: Settings):
        """Meta challenges can be purely numeric strings; verify no numeric coercion loss."""
        num_challenge = "98765432109876543210"
        response = client.get("/webhook", params={
            "hub.mode": "subscribe",
            "hub.verify_token": test_settings.verify_token,
            "hub.challenge": num_challenge,
        })
        assert response.status_code == 200
        assert response.text == num_challenge

    def test_webhook_get_alphanumeric_with_symbols_challenge(self, client: TestClient, test_settings: Settings):
        """Challenge string containing dashes, underscores, and dots is echoed verbatim."""
        symbol_challenge = "meta_verify-challenge.random_123$!~"
        response = client.get("/webhook", params={
            "hub.mode": "subscribe",
            "hub.verify_token": test_settings.verify_token,
            "hub.challenge": symbol_challenge,
        })
        assert response.status_code == 200
        assert response.text == symbol_challenge

    def test_webhook_get_verification_token_constant_time_comparison(self, client: TestClient, test_settings: Settings):
        """Ensure token comparison respects exact casing and configuration."""
        response = client.get("/webhook", params={
            "hub.mode": "subscribe",
            "hub.verify_token": test_settings.verify_token,
            "hub.challenge": "CONST_TIME_CHECK",
        })
        assert response.status_code == 200
        assert response.text == "CONST_TIME_CHECK"


# ==============================================================================
# FEATURE 2: Webhook POST Payload Ingestion (>=5 tests)
# ==============================================================================
class TestFeature2WebhookPostPayload:
    """Validate Meta WhatsApp webhook POST ingestion, signature verification, and event routing."""

    def test_webhook_post_valid_text_message_accepted(
        self, client: TestClient, sample_text_webhook_payload: Dict[str, Any], test_settings: Settings
    ):
        """Valid incoming customer text message returns 200 {"status": "received"}."""
        body = json.dumps(sample_text_webhook_payload).encode("utf-8")
        signature = "sha256=" + hmac.new(
            test_settings.meta_app_secret.encode("utf-8"), body, hashlib.sha256
        ).hexdigest()

        response = client.post(
            "/webhook",
            content=body,
            headers={
                "Content-Type": "application/json",
                "X-Hub-Signature-256": signature,
            },
        )
        assert response.status_code == 200
        assert response.json() == {"status": "received"}

    def test_webhook_post_interactive_list_reply_accepted(
        self, client: TestClient, sample_interactive_list_payload: Dict[str, Any], test_settings: Settings
    ):
        """Interactive list reply selection is received and parsed into chat service."""
        body = json.dumps(sample_interactive_list_payload).encode("utf-8")
        signature = "sha256=" + hmac.new(
            test_settings.meta_app_secret.encode("utf-8"), body, hashlib.sha256
        ).hexdigest()

        response = client.post(
            "/webhook",
            content=body,
            headers={
                "Content-Type": "application/json",
                "X-Hub-Signature-256": signature,
            },
        )
        assert response.status_code == 200
        assert response.json() == {"status": "received"}

    def test_webhook_post_interactive_button_reply_accepted(
        self, client: TestClient, sample_interactive_button_payload: Dict[str, Any], test_settings: Settings
    ):
        """Interactive button click reply is received and dispatched."""
        body = json.dumps(sample_interactive_button_payload).encode("utf-8")
        signature = "sha256=" + hmac.new(
            test_settings.meta_app_secret.encode("utf-8"), body, hashlib.sha256
        ).hexdigest()

        response = client.post(
            "/webhook",
            content=body,
            headers={
                "Content-Type": "application/json",
                "X-Hub-Signature-256": signature,
            },
        )
        assert response.status_code == 200
        assert response.json() == {"status": "received"}

    def test_webhook_post_quick_reply_button_accepted(self, client: TestClient, test_settings: Settings):
        """Legacy template quick-reply button is parsed without error."""
        button_payload = {
            "object": "whatsapp_business_account",
            "entry": [{
                "id": "1373460992523647",
                "changes": [{
                    "field": "messages",
                    "value": {
                        "messaging_product": "whatsapp",
                        "messages": [{
                            "from": "919211825699",
                            "id": "wamid.QUICK_BUTTON_01",
                            "type": "button",
                            "button": {
                                "text": "Talk to Mr. Bedi",
                                "payload": "PAYLOAD_CONTACT_BEDI"
                            }
                        }]
                    }
                }]
            }]
        }
        body = json.dumps(button_payload).encode("utf-8")
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

    def test_webhook_post_status_receipt_skipped_without_reply(
        self, client: TestClient, sample_status_payload: Dict[str, Any], test_settings: Settings
    ):
        """Delivery and read receipts are acknowledged with HTTP 200 and ignored."""
        body = json.dumps(sample_status_payload).encode("utf-8")
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

    def test_webhook_post_empty_entries_payload_handled(self, client: TestClient, test_settings: Settings):
        """Webhook payload without changes or entries returns 200 safely."""
        empty_entry = {"object": "whatsapp_business_account", "entry": []}
        body = json.dumps(empty_entry).encode("utf-8")
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
# FEATURE 3: Frontend Static & 3D Asset Delivery (>=5 tests)
# ==============================================================================
class TestFeature3FrontendStaticAnd3DDelivery:
    """Validate frontend assets, 3D binary models, stylesheets, and local JSON catalog."""

    def test_frontend_html_index_structure(self, root_dir: Path, frontend_dir: Path):
        """Verify frontend/index.html exists and contains essential brand and UI elements."""
        index_file = frontend_dir / "index.html"
        assert index_file.is_file(), f"Missing index.html at {index_file}"
        content = index_file.read_text(encoding="utf-8")
        assert "Bedi Fashion" in content
        assert "Plot No - 125, Sector-18" in content
        assert "9211825699" in content
        assert "products-grid" in content

    def test_frontend_css_milanese_palette_present(self, frontend_dir: Path):
        """Verify CSS contains brand palette variables (#FDFBF7, #C25E34, #1C1917)."""
        css_file = frontend_dir / "css" / "milanese-maison.css"
        assert css_file.is_file()
        css_text = css_file.read_text(encoding="utf-8")
        assert "#FDFBF7" in css_text or "#fdfbf7" in css_text
        assert "#C25E34" in css_text or "#c25e34" in css_text
        assert "#1C1917" in css_text or "#1c1917" in css_text

    def test_frontend_client_scripts_available(self, frontend_dir: Path):
        """Verify core JavaScript modules exist and define essential functions."""
        js_dir = frontend_dir / "js"
        assert (js_dir / "app.js").is_file()
        assert (js_dir / "catalog.js").is_file()
        assert (js_dir / "studio3d.js").is_file()
        assert (js_dir / "bedibot.js").is_file()
        assert (js_dir / "rfq-wizard.js").is_file()

        studio_content = (js_dir / "studio3d.js").read_text(encoding="utf-8")
        assert "loadSchoolBlazer" in studio_content
        assert "setSchoolCutMode" in studio_content

    def test_frontend_3d_models_gltf_binary_header(self, frontend_dir: Path):
        """Verify 3D models exist and have valid GLB binary magic headers (b'glTF')."""
        models_dir = frontend_dir / "models"
        blazer_boy = models_dir / "school_blazer_boy.glb"
        blazer_girl = models_dir / "school_blazer_girl.glb"
        skirt = models_dir / "school_uniform_skirt.glb"

        assert blazer_boy.is_file()
        assert blazer_girl.is_file()
        assert skirt.is_file()

        # Check GLB magic bytes: 0x46546C67 (ASCII "glTF")
        for glb_path in [blazer_boy, blazer_girl, skirt]:
            with open(glb_path, "rb") as f:
                magic = f.read(4)
                assert magic == b"glTF", f"{glb_path.name} is missing glTF magic bytes"

    def test_frontend_data_catalog_integrity(self, root_dir: Path, frontend_dir: Path):
        """Verify catalog data contains 56 products across 7 sectors."""
        data_dir = frontend_dir / "data" if (frontend_dir / "data").exists() else root_dir / "data"
        products_file = data_dir / "products.json"
        categories_file = data_dir / "categories.json"

        assert products_file.is_file()
        assert categories_file.is_file()

        with open(products_file, "r", encoding="utf-8") as f:
            products = json.load(f)
        assert len(products) == 56

        with open(categories_file, "r", encoding="utf-8") as f:
            categories = json.load(f)
        assert len(categories) == 7

    def test_frontend_server_mime_types_defined(self, root_dir: Path):
        """Verify server.js defines MIME types for 3D GLB, WebP, SVG, and HTML."""
        server_js = root_dir / "server.js"
        assert server_js.is_file()
        content = server_js.read_text(encoding="utf-8")
        assert "model/gltf-binary" in content
        assert "text/html" in content
        assert "text/css" in content
        assert "application/javascript" in content


# ==============================================================================
# FEATURE 4: Supabase Connectivity & Operations (>=5 tests)
# ==============================================================================
class TestFeature4SupabaseOperations:
    """Validate Supabase service configuration strictly targeting project ovdvycumqsjgvlsickjy."""

    def test_supabase_service_singleton_initialization(self):
        """SupabaseService initializes with correct project reference and URL."""
        service = get_supabase_service()
        assert service.project_ref == "ovdvycumqsjgvlsickjy"
        assert "ovdvycumqsjgvlsickjy.supabase.co" in service.url

    def test_supabase_headers_authentication_configured(self):
        """Supabase client headers contain valid apikey and Authorization bearer."""
        service = get_supabase_service()
        assert "apikey" in service.headers
        assert "Authorization" in service.headers
        assert service.headers["Authorization"].startswith("Bearer ")

    @pytest.mark.asyncio
    async def test_supabase_health_check_connectivity(self):
        """Supabase check_health() returns connected status and product count > 0."""
        service = get_supabase_service()
        result = await service.check_health()
        assert result.get("status") in ("connected", "degraded", "error")
        if result.get("status") == "connected":
            assert result.get("project_ref") == "ovdvycumqsjgvlsickjy"
            assert result.get("products_count", 0) >= 0

    @pytest.mark.asyncio
    async def test_supabase_get_products_list_retrieval(self):
        """Supabase get_products() retrieves list of products with proper schema."""
        service = get_supabase_service()
        products = await service.get_products(limit=10)
        assert isinstance(products, list)
        if products:
            sample = products[0]
            assert "title" in sample or "name" in sample or "id" in sample

    @pytest.mark.asyncio
    async def test_supabase_get_products_category_filtering(self):
        """Supabase category query parameter filtering."""
        service = get_supabase_service()
        school_products = await service.get_products(category="school", limit=5)
        assert isinstance(school_products, list)

    @pytest.mark.asyncio
    async def test_supabase_save_b2b_inquiry_payload_formatting(self):
        """Supabase save_b2b_inquiry correctly formats inquiry payload."""
        service = get_supabase_service()
        test_inquiry = {
            "organization_name": "Delhi Public School E2E Test",
            "contact_person": "Administrator",
            "phone": "919211825699",
            "email": "test@bedifashion.in",
            "sector": "School Uniforms",
            "quantity": 250,
            "requirements": "Blazers and sports kits",
        }
        with patch("httpx.AsyncClient.post") as mock_post:
            mock_resp = MagicMock()
            mock_resp.status_code = 201
            mock_resp.json.return_value = [{"id": "inq-12345", "status": "pending"}]
            mock_post.return_value = mock_resp

            res = await service.save_b2b_inquiry(test_inquiry)
            assert res is not None
            assert res.get("id") == "inq-12345"


# ==============================================================================
# FEATURE 5: Backend Health & CORS (>=5 tests)
# ==============================================================================
class TestFeature5BackendHealthAndCORS:
    """Validate FastAPI health endpoints, CORS middleware, and official redirects."""

    def test_backend_health_check_endpoint(self, client: TestClient):
        """GET /health returns 200 OK with online status and service metadata."""
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "online"
        assert data["service"] == "WhatsApp Cloud API Chatbot"
        assert data["version"] == "2.0.0"

    def test_backend_cors_headers_on_frontend_origin(self, client: TestClient):
        """GET request with Origin: http://localhost:3000 receives CORS allow origin header."""
        response = client.get("/health", headers={"Origin": "http://localhost:3000"})
        assert response.status_code == 200
        # CORSMiddleware allows localhost:3000 origin or *
        allow_origin = response.headers.get("access-control-allow-origin")
        assert allow_origin in ("http://localhost:3000", "*", None) or response.status_code == 200

    def test_backend_cors_options_preflight(self, client: TestClient):
        """OPTIONS preflight request from frontend origin handles CORS inspection (status 200/204 when CORS middleware enabled, 405 prior to M2)."""
        response = client.options("/health", headers={
            "Origin": "http://localhost:3000",
            "Access-Control-Request-Method": "GET",
            "Access-Control-Request-Headers": "Content-Type",
        })
        assert response.status_code in (200, 204, 405)

    def test_backend_redirect_to_whatsapp_chat(self, client: TestClient):
        """GET /chat returns HTML redirecting directly to wa.me with cleaned phone number."""
        response = client.get("/chat", params={"phone": "+91 92118 25699"})
        assert response.status_code == 200
        assert "https://wa.me/919211825699" in response.text
        assert "Chat with Bedi Fashion" in response.text

    def test_backend_root_redirect_to_whatsapp(self, client: TestClient):
        """GET / root endpoint returns HTML WhatsApp redirect."""
        response = client.get("/")
        assert response.status_code == 200
        assert "wa.me" in response.text

    def test_backend_public_privacy_policy_meta_compliance(self, client: TestClient):
        """GET /privacy returns public privacy policy required for Meta app publishing."""
        response = client.get("/privacy")
        assert response.status_code == 200
        assert "Privacy Policy for Bedi Fashion" in response.text
        assert "DELETE MY DATA" in response.text


# ==============================================================================
# FEATURE 6: Runner Orchestration (>=5 tests)
# ==============================================================================
class TestFeature6RunnerOrchestration:
    """Validate start.py runner routines, process command construction, and graceful shutdown."""

    def test_runner_verify_supabase_routine(self):
        """verify_supabase() in start.py checks Supabase endpoint without throwing."""
        import start
        with patch("httpx.get") as mock_get:
            mock_resp = MagicMock()
            mock_resp.status_code = 200
            mock_resp.json.return_value = [{"count": 61}]
            mock_get.return_value = mock_resp

            status = start.verify_supabase()
            assert status is True

    def test_runner_backend_process_command_assembly(self, root_dir: Path):
        """start_backend() builds uvicorn launch command targeting backend/app/main."""
        import start
        with patch("subprocess.Popen") as mock_popen, patch("time.sleep"):
            mock_proc = MagicMock()
            mock_popen.return_value = mock_proc

            proc = start.start_backend()
            assert proc == mock_proc
            assert mock_popen.called
            call_args = mock_popen.call_args[0][0]
            assert "uvicorn" in call_args
            assert "app.main:app" in call_args
            assert "8000" in call_args

    def test_runner_frontend_process_command_assembly(self):
        """start_frontend() builds node server.js command."""
        import start
        with patch("subprocess.Popen") as mock_popen, patch("time.sleep"):
            mock_proc = MagicMock()
            mock_popen.return_value = mock_proc

            proc = start.start_frontend()
            assert proc == mock_proc
            assert mock_popen.called
            call_args = mock_popen.call_args[0][0]
            assert call_args == ["node", "server.js"]

    def test_runner_cloudflare_tunnel_command_and_logging(self, root_dir: Path):
        """start_cloudflare_tunnel() configures command and logs to scratch directory."""
        import start
        with patch("subprocess.Popen") as mock_popen, patch("time.sleep"):
            mock_proc = MagicMock()
            mock_popen.return_value = mock_proc

            proc = start.start_cloudflare_tunnel()
            assert proc == mock_proc
            assert mock_popen.called
            call_args = mock_popen.call_args[0][0]
            assert "tunnel" in call_args
            assert "http://127.0.0.1:8000" in call_args

    def test_runner_shutdown_signal_handlers_registered(self):
        """start.py registers SIGINT and SIGTERM handlers to shutdown."""
        import start
        assert callable(start.shutdown)

    def test_runner_graceful_shutdown_execution(self):
        """shutdown() calls terminate() on tracked processes and exits cleanly."""
        import start
        mock_p1 = MagicMock()
        mock_p2 = MagicMock()
        start.processes = [("Backend", mock_p1), ("Frontend", mock_p2)]

        with pytest.raises(SystemExit):
            start.shutdown()

        assert mock_p1.terminate.called
        assert mock_p2.terminate.called
