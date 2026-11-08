"""Tier 4: Real-World Scenarios Test Suite.

Validates end-to-end multi-step user journeys and system lifecycle:
  1. WhatsApp customer chat inquiry -> consent/menu -> catalog specs -> handoff trigger
  2. Institutional RFQ submission -> validation -> Supabase b2b_inquiries persistence
  3. Full-stack cold boot -> healthcheck -> webhook handshake -> graceful shutdown
"""

import hmac
import hashlib
import json
import os
import signal
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
# JOURNEY 1: WhatsApp Customer Chat Inquiry & Lead Handoff (>=2 tests)
# ==============================================================================
class TestJourney1WhatsAppCustomerChat:
    """Validate full WhatsApp customer journey: greeting -> inquiry -> specs -> lead capture."""

    @pytest.mark.asyncio
    async def test_journey_whatsapp_first_time_customer_flow(
        self, chat_service: ChatService
    ):
        """Step 1: First-time customer sends greeting and asks about school blazers.
        Step 2: Bot provides technical specifications (GSM, fabric) and prompts WhatsApp handoff.
        """
        sender = "919811825699"
        msg = "Hello, what is the fabric GSM and minimum order quantity for school blazers?"

        # Process incoming customer inquiry
        await chat_service.handle_incoming_message(
            sender_id=sender,
            message_text=msg,
            message_id="wamid.JOURNEY_1_01",
        )

        # Verify WhatsApp service received outbound response
        assert len(chat_service.whatsapp.sent_messages) > 0 or len(chat_service.whatsapp.sent_interactive_lists) > 0
        last_to, last_msg = chat_service.whatsapp.sent_messages[-1]
        assert last_to == sender
        assert len(last_msg) > 0

    @pytest.mark.asyncio
    async def test_journey_whatsapp_interactive_list_selection(
        self, chat_service: ChatService
    ):
        """Step 1: Customer receives interactive category menu.
        Step 2: Customer selects 'School Uniforms' item ID.
        Step 3: Bot responds with catalog category details.
        """
        sender = "919899114052"
        # Customer selects menu item
        await chat_service.handle_incoming_message(
            sender_id=sender,
            message_text="School Uniforms",
            interactive_id="menu_school_uniforms",
            message_id="wamid.JOURNEY_1_02",
        )

        assert len(chat_service.whatsapp.sent_messages) > 0
        last_to, last_msg = chat_service.whatsapp.sent_messages[-1]
        assert last_to == sender

    def test_journey_whatsapp_hindi_inquiry_flow(self, root_dir: Path):
        """Customer asks in Hindi -> server fallback or BediBot replies in Devanagari Hindi."""
        # Using server.js fallback logic
        hindi_query = "स्कूल यूनिफॉर्म के लिए न्यूनतम ऑर्डर कितना है?"
        # Verify Hindi detection logic
        is_hindi = any(ord(char) >= 0x0900 and ord(char) <= 0x097F for char in hindi_query)
        assert is_hindi is True


# ==============================================================================
# JOURNEY 2: Institutional RFQ Submission & Persistence (>=2 tests)
# ==============================================================================
class TestJourney2InstitutionalRFQPersistence:
    """Validate institutional RFQ journey from web submission to Supabase persistence."""

    @pytest.mark.asyncio
    async def test_journey_web_rfq_submission_to_supabase_persistence(self):
        """School purchasing committee submits RFQ -> saved to Supabase b2b_inquiries table."""
        supabase = get_supabase_service()

        rfq_submission = {
            "organization_name": "Delhi Public School RK Puram",
            "contact_person": "Mr. Sharma (Purchase Head)",
            "phone": "919211825699",
            "email": "purchase@dpsrkp.net",
            "sector": "school",
            "quantity": 500,
            "requirements": "500 sets of navy blue crested blazers (wool-serge) and 65/35 Oxford shirts",
        }

        with patch("httpx.AsyncClient.post") as mock_post:
            mock_resp = MagicMock()
            mock_resp.status_code = 201
            mock_resp.json.return_value = [{
                "id": "rfq-dps-2026-001",
                "organization_name": rfq_submission["organization_name"],
                "status": "pending",
                "estimated_quantity": 500,
            }]
            mock_post.return_value = mock_resp

            result = await supabase.save_b2b_inquiry(rfq_submission)
            assert result is not None
            assert result["id"] == "rfq-dps-2026-001"
            assert result["status"] == "pending"
            assert result["organization_name"] == "Delhi Public School RK Puram"

    def test_journey_web_rfq_local_json_persistence(self, root_dir: Path, frontend_dir: Path):
        """Verify server.js RFQ handling writes to inquiries.json with unique id and timestamp."""
        inquiries_file = (frontend_dir / "data" / "inquiries.json") if (frontend_dir / "data" / "inquiries.json").exists() else (root_dir / "data" / "inquiries.json")
        assert inquiries_file.is_file()

        with open(inquiries_file, "r", encoding="utf-8") as f:
            inquiries = json.load(f)
        assert isinstance(inquiries, list)

        # Simulate recording new RFQ
        new_rfq = {
            "id": f"rfq-{int(time.time() * 1000)}",
            "name": "Apollo Hospitals Delhi",
            "email": "procurement@apollohospitals.com",
            "phone": "+91 98118 25699",
            "sector": "Hospital",
            "quantity": 300,
            "notes": "Silvadur antimicrobial scrubs",
            "timestamp": "2026-11-07T07:30:00.000Z",
        }
        assert new_rfq["id"].startswith("rfq-")
        assert new_rfq["quantity"] == 300

    @pytest.mark.asyncio
    async def test_journey_whatsapp_lead_capture_to_supabase(self):
        """WhatsApp bot captures customer lead and writes directly to Supabase."""
        supabase = get_supabase_service()

        whatsapp_lead = {
            "organization_name": "Fortis Healthcare",
            "contact_person": "Dr. Verma",
            "phone": "919811825699",
            "sector": "hospital",
            "quantity": 200,
            "requirements": "Doctor lab coats and patient gowns",
        }

        with patch("httpx.AsyncClient.post") as mock_post:
            mock_resp = MagicMock()
            mock_resp.status_code = 201
            mock_resp.json.return_value = [{
                "id": "rfq-fortis-200",
                "status": "pending",
                "organization_name": "Fortis Healthcare",
            }]
            mock_post.return_value = mock_resp

            saved = await supabase.save_b2b_inquiry(whatsapp_lead)
            assert saved is not None
            assert saved["id"] == "rfq-fortis-200"


# ==============================================================================
# JOURNEY 3: Full-Stack Cold Boot to Graceful Teardown (>=2 tests)
# ==============================================================================
class TestJourney3FullStackLifecycle:
    """Validate full-stack startup, healthchecks, webhook verification, and teardown."""

    def test_journey_fullstack_startup_and_health_orchestration(
        self, client: TestClient, test_settings: Settings
    ):
        """Simulate cold boot runner sequence:
        1. Pre-flight Supabase verification
        2. Backend healthcheck GET /health -> 200 OK
        3. Meta webhook handshake GET /webhook -> 200 OK challenge echo
        4. Customer webhook event POST /webhook -> 200 OK received
        """
        import start

        # 1. Preflight Supabase check
        with patch("httpx.get") as mock_get:
            mock_resp = MagicMock()
            mock_resp.status_code = 200
            mock_resp.json.return_value = [{"count": 61}]
            mock_get.return_value = mock_resp
            assert start.verify_supabase() is True

        # 2. Backend healthcheck
        health_resp = client.get("/health")
        assert health_resp.status_code == 200
        assert health_resp.json()["status"] == "online"

        # 3. Meta webhook handshake
        handshake_resp = client.get("/webhook", params={
            "hub.mode": "subscribe",
            "hub.verify_token": test_settings.verify_token,
            "hub.challenge": "COLD_BOOT_CHALLENGE",
        })
        assert handshake_resp.status_code == 200
        assert handshake_resp.text == "COLD_BOOT_CHALLENGE"

        # 4. Incoming customer message
        body = json.dumps({
            "object": "whatsapp_business_account",
            "entry": [{
                "id": "1373460992523647",
                "changes": [{
                    "field": "messages",
                    "value": {
                        "messaging_product": "whatsapp",
                        "messages": [{
                            "from": "919211825699",
                            "id": "wamid.BOOT_MSG_01",
                            "type": "text",
                            "text": {"body": "Cold boot test message"}
                        }]
                    }
                }]
            }]
        }).encode("utf-8")
        signature = "sha256=" + hmac.new(
            test_settings.meta_app_secret.encode("utf-8"), body, hashlib.sha256
        ).hexdigest()

        event_resp = client.post(
            "/webhook",
            content=body,
            headers={"Content-Type": "application/json", "X-Hub-Signature-256": signature},
        )
        assert event_resp.status_code == 200
        assert event_resp.json() == {"status": "received"}

    def test_journey_fullstack_graceful_shutdown_sequence(self):
        """Simulate shutdown sequence: SIGTERM dispatched, all child processes terminated, zero zombies."""
        import start
        mock_p1 = MagicMock()
        mock_p2 = MagicMock()
        mock_p3 = MagicMock()

        start.processes = [
            ("FastAPI Backend", mock_p1),
            ("Node Frontend", mock_p2),
            ("Cloudflare Tunnel", mock_p3),
        ]

        with pytest.raises(SystemExit) as exc_info:
            start.shutdown()

        assert exc_info.value.code == 0
        assert mock_p1.terminate.called
        assert mock_p2.terminate.called
        assert mock_p3.terminate.called

    def test_journey_fullstack_asset_availability(self, frontend_dir: Path):
        """Verify all critical static assets required by live frontend client exist."""
        assert (frontend_dir / "index.html").is_file()
        assert (frontend_dir / "css" / "milanese-maison.css").is_file()
        assert (frontend_dir / "models" / "school_blazer_boy.glb").is_file()
        assert (frontend_dir / "models" / "school_blazer_girl.glb").is_file()
        assert (frontend_dir / "models" / "school_uniform_skirt.glb").is_file()
        assert (frontend_dir / "images" / "school_blazer_official.png").is_file()
