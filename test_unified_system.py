#!/usr/bin/env python3
"""
BEDI FASHION™ — UNIFIED END-TO-END SYSTEM INTEGRATION TEST SUITE
Validates:
  1. Frontend Architecture & Clean Asset Separation (frontend/)
  2. Backend FastAPI Architecture & Services (backend/)
  3. Supabase Cloud Database Integration strictly against Project ovdvycumqsjgvlsickjy
  4. WhatsApp Cloud API Webhook Handshake & Verification
  5. Security, Phone ID (1373460992523647) and Display Number (+91 92118 25699)
"""

import os
import sys

# Configure UTF-8 stdout for Windows consoles
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

from pathlib import Path
from dotenv import load_dotenv

ROOT_DIR = Path(__file__).resolve().parent
load_dotenv(ROOT_DIR / ".env")

passed = 0
failed = 0


def record(name: str, success: bool, note: str = ""):
    global passed, failed
    if success:
        passed += 1
        print(f"  ✓ PASS: {name} {note}")
    else:
        failed += 1
        print(f"  ✗ FAIL: {name} {note}")


def test_directory_structure():
    print("\n[1] Testing Clean Directory Layout & Asset Segregation:")
    record("frontend/ directory exists", (ROOT_DIR / "frontend").is_dir())
    record("frontend/index.html exists", (ROOT_DIR / "frontend" / "index.html").is_file())
    record("frontend/css exists", (ROOT_DIR / "frontend" / "css").is_dir())
    record("frontend/js exists", (ROOT_DIR / "frontend" / "js").is_dir())
    record("frontend/models exists", (ROOT_DIR / "frontend" / "models").is_dir())
    record("frontend/models/school_uniform_skirt.glb exists", (ROOT_DIR / "frontend" / "models" / "school_uniform_skirt.glb").is_file())

    record("backend/ directory exists", (ROOT_DIR / "backend").is_dir())
    record("backend/app/main.py exists", (ROOT_DIR / "backend" / "app" / "main.py").is_file())
    record("backend/app/api/webhook.py exists", (ROOT_DIR / "backend" / "app" / "api" / "webhook.py").is_file())
    record("backend/app/services/supabase_service.py exists", (ROOT_DIR / "backend" / "app" / "services" / "supabase_service.py").is_file())
    record("backend/requirements.txt exists", (ROOT_DIR / "backend" / "requirements.txt").is_file())
    record("supabase/ directory exists", (ROOT_DIR / "supabase").is_dir())
    record("start.py master runner exists", (ROOT_DIR / "start.py").is_file())


def test_environment_and_supabase():
    print("\n[2] Testing Environment Configuration & Supabase Connection:")
    ref = os.getenv("SUPABASE_PROJECT_REF")
    record("SUPABASE_PROJECT_REF is ovdvycumqsjgvlsickjy", ref == "ovdvycumqsjgvlsickjy", f"(got {ref})")

    token = os.getenv("SUPABASE_ACCESS_TOKEN", "")
    record("SUPABASE_ACCESS_TOKEN is configured", bool(token and token.startswith("sbp_")))

    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "") or os.getenv("SUPABASE_ANON_KEY", "")
    record("SUPABASE API Key is configured", bool(key and len(key) > 30))

    import httpx
    url = os.getenv("SUPABASE_URL", "https://ovdvycumqsjgvlsickjy.supabase.co")
    headers = {"apikey": key, "Authorization": f"Bearer {key}"}

    try:
        resp = httpx.get(f"{url}/rest/v1/products?select=count", headers=headers, timeout=10.0)
        record("Supabase Products table accessible", resp.status_code == 200, f"(HTTP {resp.status_code})")
        if resp.status_code == 200:
            count = resp.json()[0].get("count", 0)
            record("Supabase Products count > 0", count > 0, f"(count: {count})")
    except Exception as exc:
        record("Supabase Products query", False, str(exc))

    try:
        resp_inq = httpx.get(f"{url}/rest/v1/b2b_inquiries?select=count", headers=headers, timeout=10.0)
        record("Supabase b2b_inquiries table accessible", resp_inq.status_code == 200, f"(HTTP {resp_inq.status_code})")
    except Exception as exc:
        record("Supabase b2b_inquiries query", False, str(exc))


def test_whatsapp_configuration():
    print("\n[3] Testing WhatsApp Cloud API & Phone Targeting:")
    phone_id = os.getenv("PHONE_NUMBER_ID")
    record("PHONE_NUMBER_ID is 1373460992523647", phone_id == "1373460992523647", f"(got {phone_id})")

    phone_num = os.getenv("WHATSAPP_PHONE_NUMBER")
    record("WHATSAPP_PHONE_NUMBER is 919211825699", phone_num == "919211825699", f"(got {phone_num})")

    token = os.getenv("WHATSAPP_TOKEN", "")
    record("WHATSAPP_TOKEN is configured", bool(token and token.startswith("EABB")))

    import httpx
    try:
        r = httpx.get(f"https://graph.facebook.com/v25.0/{phone_id}", headers={"Authorization": f"Bearer {token}"}, timeout=10.0)
        record("Meta Graph API Phone status is 200 OK", r.status_code == 200)
        if r.status_code == 200:
            data = r.json()
            disp_num = data.get("display_phone_number", "").replace(" ", "").replace("+", "")
            record("Meta verified display number matches 919211825699", "919211825699" in disp_num, f"(got {disp_num})")
            record("Meta quality rating is GREEN", data.get("quality_rating") == "GREEN", f"(rating: {data.get('quality_rating')})")
    except Exception as exc:
        record("Meta Graph API connectivity", False, str(exc))


def test_fastapi_webhook_handshake():
    print("\n[4] Testing FastAPI Webhook Handshake & Verification:")
    sys.path.insert(0, str(ROOT_DIR / "backend"))
    from fastapi.testclient import TestClient
    from app.main import create_app

    app = create_app()
    client = TestClient(app)

    # Health endpoint
    res_health = client.get("/health")
    record("GET /health returns 200 OK", res_health.status_code == 200)

    # Meta webhook handshake
    verify_token = os.getenv("VERIFY_TOKEN", "my_whatsapp_secret_token_2026")
    res_valid = client.get("/webhook", params={
        "hub.mode": "subscribe",
        "hub.verify_token": verify_token,
        "hub.challenge": "123456789_BEDI_CHALLENGE"
    })
    record("GET /webhook handshake with valid token returns 200", res_valid.status_code == 200)
    record("GET /webhook returns exact challenge echo", res_valid.text == "123456789_BEDI_CHALLENGE")

    # Mismatch token rejection
    res_invalid = client.get("/webhook", params={
        "hub.mode": "subscribe",
        "hub.verify_token": "wrong_token",
        "hub.challenge": "123"
    })
    record("GET /webhook with invalid token returns 403 Forbidden", res_invalid.status_code == 403)


def main():
    print("=" * 70)
    print("🧵 RUNNING BEDI FASHION™ UNIFIED SYSTEM INTEGRATION TEST SUITE")
    print("=" * 70)

    test_directory_structure()
    test_environment_and_supabase()
    test_whatsapp_configuration()
    test_fastapi_webhook_handshake()

    print("\n" + "=" * 70)
    print(f"🏁 UNIFIED TEST SUMMARY: {passed} PASSED, {failed} FAILED")
    print("=" * 70)

    if failed > 0:
        sys.exit(1)


if __name__ == "__main__":
    main()
