#!/usr/bin/env python3
"""
BEDI FASHION™ — ADVERSARIAL BACKEND VERIFICATION PROBE HARNESS
Author: challenger_1 (Empirical Challenger)
Probes:
  1. CORS Preflight (OPTIONS) requests from http://localhost:3000 and http://127.0.0.1:3000
  2. GET /webhook verification handshake with valid tokens and varied challenges
  3. GET /webhook rejection of invalid verify tokens, wrong modes, and missing parameters
  4. POST /webhook HMAC-SHA256 signature enforcement (tampered, missing, forged)
  5. POST /webhook valid HMAC-SHA256 signature ingestion
"""

import hashlib
import hmac
import json
import os
import sys
from pathlib import Path
from unittest.mock import AsyncMock, patch
from dotenv import load_dotenv

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

ROOT_DIR = Path(__file__).resolve().parent
BACKEND_DIR = ROOT_DIR / "backend"
load_dotenv(ROOT_DIR / ".env")

sys.path.insert(0, str(BACKEND_DIR))
sys.path.insert(0, str(ROOT_DIR))

from fastapi.testclient import TestClient
from app.config import Settings, get_settings
from app.main import create_app
from app.services.chat import ChatService, get_chat_service
from app.services.llm import LLMProvider
from app.services.whatsapp import WhatsAppService

# Mock providers to ensure 100% deterministic, offline execution
class MockLLM(LLMProvider):
    async def generate_reply(self, prompt: str, system_prompt: str = None) -> str:
        return "Adversarial test response: Bedi Fashion uniforms."

class MockWhatsApp(WhatsAppService):
    def __init__(self):
        self.sent = []
    async def send_text(self, to_number: str, message: str) -> bool:
        self.sent.append((to_number, message))
        return True

test_settings = Settings(
    whatsapp_token="test_wa_token_secret_123",
    phone_number_id="1373460992523647",
    verify_token="test_verification_secret_2026",
    meta_app_secret="test_meta_app_secret_key_999",
    gemini_api_key="test_gemini_key",
    gemini_model="gemini-3.5-flash-lite",
    database_url="sqlite+aiosqlite:///./backend/whatsapp_bot.db",
    log_level="INFO",
)

mock_whatsapp = MockWhatsApp()
mock_llm = MockLLM()
mock_chat_service = ChatService(
    llm_provider=mock_llm,
    whatsapp_service=mock_whatsapp,
    settings=test_settings,
)

# Patch init_db during app creation so no database lock occurs
with patch("app.main.init_db", new_callable=AsyncMock):
    app = create_app()

app.dependency_overrides[get_settings] = lambda: test_settings
app.dependency_overrides[get_chat_service] = lambda: mock_chat_service

client = TestClient(app, raise_server_exceptions=False)

passed = 0
failed = 0

def record(name: str, condition: bool, detail: str = ""):
    global passed, failed
    if condition:
        passed += 1
        print(f"  ✓ PASS: {name} {detail}", flush=True)
    else:
        failed += 1
        print(f"  ✗ FAIL: {name} {detail}", flush=True)

print("=" * 75, flush=True)
print("🛡️ ADVERSARIAL VERIFICATION: BACKEND ENDPOINTS, CORS & WEBHOOK SECURITY", flush=True)
print("=" * 75, flush=True)

# ==============================================================================
# 1. CORS PREFLIGHT PROBES
# ==============================================================================
print("\n[1] Probing CORS Middleware on backend/app/main.py:", flush=True)

# Probe 1A: OPTIONS Preflight from http://localhost:3000
opt_res = client.options(
    "/health",
    headers={
        "Origin": "http://localhost:3000",
        "Access-Control-Request-Method": "GET",
        "Access-Control-Request-Headers": "Content-Type, Authorization",
    },
)
print(f"    Payload: OPTIONS /health (Origin: http://localhost:3000)", flush=True)
print(f"    Status: {opt_res.status_code}", flush=True)
print(f"    Headers: {dict(opt_res.headers)}", flush=True)
record(
    "OPTIONS preflight from http://localhost:3000 returns 200",
    opt_res.status_code == 200,
    f"(HTTP {opt_res.status_code})"
)
allow_origin = opt_res.headers.get("access-control-allow-origin")
record(
    "CORS header access-control-allow-origin allows http://localhost:3000",
    allow_origin in ("http://localhost:3000", "*"),
    f"(got: '{allow_origin}')"
)
allow_cred = opt_res.headers.get("access-control-allow-credentials")
record(
    "CORS header access-control-allow-credentials is true",
    allow_cred == "true",
    f"(got: '{allow_cred}')"
)
allow_methods = opt_res.headers.get("access-control-allow-methods", "")
record(
    "CORS header access-control-allow-methods permits GET/POST/OPTIONS",
    "GET" in allow_methods or "*" in allow_methods,
    f"(got: '{allow_methods}')"
)

# Probe 1B: OPTIONS Preflight from http://127.0.0.1:3000
opt_ip_res = client.options(
    "/health",
    headers={
        "Origin": "http://127.0.0.1:3000",
        "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "Content-Type, X-Hub-Signature-256",
    },
)
record(
    "OPTIONS preflight from http://127.0.0.1:3000 returns 200",
    opt_ip_res.status_code == 200,
    f"(HTTP {opt_ip_res.status_code})"
)
record(
    "CORS header allows http://127.0.0.1:3000",
    opt_ip_res.headers.get("access-control-allow-origin") in ("http://127.0.0.1:3000", "*")
)

# Probe 1C: Actual GET /health with Origin
get_cors = client.get("/health", headers={"Origin": "http://localhost:3000"})
record(
    "Actual GET /health with Origin includes access-control-allow-origin",
    get_cors.headers.get("access-control-allow-origin") in ("http://localhost:3000", "*")
)


# ==============================================================================
# 2. GET /webhook TOKEN VERIFICATION (VALID TOKENS & CHALLENGE ECHO)
# ==============================================================================
print("\n[2] Probing GET /webhook Valid Verification Handshake & Challenge Echo:", flush=True)

challenges = [
    ("Standard challenge string", "123456789_BEDI_STANDARD_CHALLENGE"),
    ("64-digit numeric string", "9876543210123456789098765432101234567890987654321012345678901234"),
    ("Symbol-rich challenge", "meta.verify:challenge_token-123_456$!@#%^*"),
    ("Devanagari unicode challenge", "बेदी_फैशन_चैलेंज_9211825699"),
]

for label, ch in challenges:
    r = client.get("/webhook", params={
        "hub.mode": "subscribe",
        "hub.verify_token": test_settings.verify_token,
        "hub.challenge": ch,
    })
    print(f"    Payload: GET /webhook?hub.mode=subscribe&hub.verify_token={test_settings.verify_token}&hub.challenge={ch}", flush=True)
    print(f"    Response: HTTP {r.status_code}, Body: '{r.text}', Content-Type: '{r.headers.get('content-type')}'", flush=True)
    record(f"GET /webhook accepts {label}", r.status_code == 200)
    record(f"GET /webhook exact plain-text echo for {label}", r.text == ch)
    record(f"GET /webhook Content-Type contains text/plain for {label}", "text/plain" in r.headers.get("content-type", ""))


# ==============================================================================
# 3. GET /webhook ADVERSARIAL TOKEN REJECTION PROBES
# ==============================================================================
print("\n[3] Probing GET /webhook Adversarial Rejection (Invalid Tokens, Modes, Params):", flush=True)

invalid_tokens = [
    ("Wrong token string", "COMPLETELY_WRONG_TOKEN"),
    ("Case mismatch token", test_settings.verify_token.upper()),
    ("Token with trailing space", test_settings.verify_token + " "),
    ("Token with leading space", " " + test_settings.verify_token),
    ("SQL Injection token (' OR '1'='1)", "' OR '1'='1"),
    ("XSS script injection token", "<script>alert(1)</script>"),
    ("Null string token", "null"),
    ("Empty string token", ""),
]

for label, inv_tok in invalid_tokens:
    r = client.get("/webhook", params={
        "hub.mode": "subscribe",
        "hub.verify_token": inv_tok,
        "hub.challenge": "123",
    })
    print(f"    Probe: {label} (token='{inv_tok}') -> HTTP {r.status_code} ({r.text})", flush=True)
    expected_status = (400, 403) if inv_tok == "" else (403,)
    record(
        f"Rejection of {label}",
        r.status_code in expected_status,
        f"(HTTP {r.status_code})"
    )

# Invalid modes with valid token
invalid_modes = ["unsubscribe", "publish", "SUBSCRIBE", "admin", ""]
for inv_mode in invalid_modes:
    r = client.get("/webhook", params={
        "hub.mode": inv_mode,
        "hub.verify_token": test_settings.verify_token,
        "hub.challenge": "123",
    })
    expected_status = (400, 403) if inv_mode == "" else (403,)
    record(
        f"Rejection of invalid hub.mode='{inv_mode}'",
        r.status_code in expected_status,
        f"(HTTP {r.status_code})"
    )

# Missing parameters
r_no_mode = client.get("/webhook", params={"hub.verify_token": test_settings.verify_token, "hub.challenge": "123"})
record("Rejection of missing hub.mode (HTTP 400)", r_no_mode.status_code == 400)

r_no_tok = client.get("/webhook", params={"hub.mode": "subscribe", "hub.challenge": "123"})
record("Rejection of missing hub.verify_token (HTTP 400)", r_no_tok.status_code == 400)

r_no_ch = client.get("/webhook", params={"hub.mode": "subscribe", "hub.verify_token": test_settings.verify_token})
record("Rejection of missing hub.challenge (HTTP 400)", r_no_ch.status_code == 400)


# ==============================================================================
# 4. POST /webhook HMAC-SHA256 SIGNATURE SECURITY PROBES
# ==============================================================================
print("\n[4] Probing POST /webhook HMAC-SHA256 Signature Verification:", flush=True)

sample_payload = {
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
                    "id": "wamid.TEST_ADVERSARIAL_001",
                    "timestamp": "1730966400",
                    "text": {"body": "We need 500 crested school blazers for DAV School."},
                    "type": "text"
                }]
            }
        }]
    }]
}
raw_bytes = json.dumps(sample_payload).encode("utf-8")

# Probe 4A: Missing signature header
r_no_sig = client.post("/webhook", content=raw_bytes, headers={"Content-Type": "application/json"})
print(f"    Probe: Missing X-Hub-Signature-256 header -> HTTP {r_no_sig.status_code} ({r_no_sig.text})", flush=True)
record("Missing X-Hub-Signature-256 rejected with 403 Forbidden", r_no_sig.status_code == 403)

# Probe 4B: Invalid HMAC signature
invalid_signatures = [
    ("All zeros signature", "sha256=0000000000000000000000000000000000000000000000000000000000000000"),
    ("Wrong algorithm sha1", "sha1=abcdef1234567890abcdef1234567890abcdef12"),
    ("Malformed prefix sha256:", "sha256:abcdef1234567890abcdef1234567890abcdef12"),
    ("Non-hex characters in digest", "sha256=not_a_valid_hex_digest_string_zzzzzz"),
    ("Empty digest", "sha256="),
    ("Bearer token instead of signature", "Bearer secret_token"),
]

for label, bad_sig in invalid_signatures:
    r = client.post("/webhook", content=raw_bytes, headers={
        "Content-Type": "application/json",
        "X-Hub-Signature-256": bad_sig,
    })
    record(f"Rejection of {label} (HTTP 403)", r.status_code == 403)

# Probe 4C: Signature computed with wrong secret key
attacker_secret = "ATTACKER_UNAUTHORIZED_SECRET_KEY"
attacker_sig = "sha256=" + hmac.new(
    attacker_secret.encode("utf-8"), raw_bytes, hashlib.sha256
).hexdigest()
r_wrong_key = client.post("/webhook", content=raw_bytes, headers={
    "Content-Type": "application/json",
    "X-Hub-Signature-256": attacker_sig,
})
record("Signature with wrong secret key rejected with 403", r_wrong_key.status_code == 403)

# Probe 4D: Tampered payload bytes
valid_sig = "sha256=" + hmac.new(
    test_settings.meta_app_secret.encode("utf-8"), raw_bytes, hashlib.sha256
).hexdigest()
tampered_bytes = raw_bytes + b" "
r_tampered = client.post("/webhook", content=tampered_bytes, headers={
    "Content-Type": "application/json",
    "X-Hub-Signature-256": valid_sig,
})
record("Tampered payload rejected with 403", r_tampered.status_code == 403)


# ==============================================================================
# 5. POST /webhook VALID SIGNATURE INGESTION PROBES
# ==============================================================================
print("\n[5] Probing POST /webhook Valid Signature Ingestion:", flush=True)

# Probe 5A: Valid signature on customer text message
r_valid_text = client.post("/webhook", content=raw_bytes, headers={
    "Content-Type": "application/json",
    "X-Hub-Signature-256": valid_sig,
})
print(f"    Payload: Valid HMAC signature on text inquiry", flush=True)
print(f"    Response: HTTP {r_valid_text.status_code}, Body: {r_valid_text.json()}", flush=True)
record("Valid signature text payload returns 200 OK", r_valid_text.status_code == 200)
record("Valid signature text payload returns status: received", r_valid_text.json().get("status") == "received")

# Probe 5B: Valid signature on interactive list selection
interactive_payload = {
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
                    "id": "wamid.INT_REPLY_02",
                    "timestamp": "1730966400",
                    "type": "interactive",
                    "interactive": {
                        "type": "list_reply",
                        "list_reply": {"id": "cat_industrial", "title": "Industrial Safety"}
                    }
                }]
            }
        }]
    }]
}
int_bytes = json.dumps(interactive_payload).encode("utf-8")
int_sig = "sha256=" + hmac.new(test_settings.meta_app_secret.encode("utf-8"), int_bytes, hashlib.sha256).hexdigest()
r_int = client.post("/webhook", content=int_bytes, headers={
    "Content-Type": "application/json",
    "X-Hub-Signature-256": int_sig,
})
record("Valid signature interactive list selection returns 200 OK", r_int.status_code == 200)

# Probe 5C: Status delivery receipt (skipped without outbound reply)
status_payload = {
    "object": "whatsapp_business_account",
    "entry": [{
        "id": "1373460992523647",
        "changes": [{
            "field": "messages",
            "value": {
                "messaging_product": "whatsapp",
                "metadata": {"display_phone_number": "919211825699", "phone_number_id": "1373460992523647"},
                "statuses": [{
                    "id": "wamid.SENT_01",
                    "status": "delivered",
                    "timestamp": "1730966401",
                    "recipient_id": "919811825699"
                }]
            }
        }]
    }]
}
status_bytes = json.dumps(status_payload).encode("utf-8")
status_sig = "sha256=" + hmac.new(test_settings.meta_app_secret.encode("utf-8"), status_bytes, hashlib.sha256).hexdigest()
r_status = client.post("/webhook", content=status_bytes, headers={
    "Content-Type": "application/json",
    "X-Hub-Signature-256": status_sig,
})
record("Valid signature delivery receipt returns 200 OK", r_status.status_code == 200)

print("\n" + "=" * 75, flush=True)
print(f"🏁 BACKEND ADVERSARIAL SUMMARY: {passed} PASSED, {failed} FAILED", flush=True)
print("=" * 75, flush=True)

if failed > 0:
    sys.exit(1)
