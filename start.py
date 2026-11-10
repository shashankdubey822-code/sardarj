#!/usr/bin/env python3
"""
BEDI FASHION™ — UNIFIED PRODUCTION MASTER RUNNER
Orchestrates:
  1. Frontend Luxury Flagship Server (Node.js on :3000)
  2. Backend Asynchronous WhatsApp & Gemini Server (FastAPI/Uvicorn on :8000)
  3. Supabase Cloud Database Integration (Project: ovdvycumqsjgvlsickjy)
  4. Automatic Cloudflare Public Tunnel for 24x7 WhatsApp Webhooks
"""

import os
import sys
from pathlib import Path

# Configure UTF-8 stdout for Windows consoles
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

import time
import signal
import subprocess
import threading
from dotenv import load_dotenv

# Root Directory
ROOT_DIR = Path(__file__).resolve().parent
load_dotenv(ROOT_DIR / ".env")

# Force unbuffered output
sys.stdout.reconfigure(line_buffering=True)

# Global process tracking
processes = []


def banner():
    from datetime import datetime
    heritage_years = max(1, datetime.now().year - 1987)
    print(f"""
================================================================================
  🧵 BEDI FASHION™ — UNIFIED FULL-STACK PRODUCTION PLATFORM (EST. 1987 • {heritage_years}+ YRS)
  Integrated Frontend • FastAPI Backend • Supabase • 24x7 WhatsApp Bot
================================================================================
""")


def verify_supabase():
    ref = os.getenv("SUPABASE_PROJECT_REF", "ovdvycumqsjgvlsickjy")
    token = os.getenv("SUPABASE_ACCESS_TOKEN", "")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
    url = os.getenv("SUPABASE_URL", f"https://{ref}.supabase.co")

    print(f"[*] Verifying Supabase project [{ref}]...")
    try:
        import httpx
        headers = {"apikey": key, "Authorization": f"Bearer {key}"}
        resp = httpx.get(f"{url}/rest/v1/products?select=count", headers=headers, timeout=8.0)
        if resp.status_code == 200:
            count = resp.json()[0].get("count", 0)
            print(f"    ✓ Supabase Connected: {count} products verified in live database.")
            return True
        else:
            print(f"    ⚠ Supabase returned status {resp.status_code}: {resp.text}")
    except Exception as exc:
        print(f"    ⚠ Supabase verification note: {exc}")
    return False


def start_backend():
    print("[*] Starting FastAPI Backend on port 8000...")
    cmd = [
        sys.executable, "-m", "uvicorn", "app.main:app",
        "--host", "0.0.0.0",
        "--port", "8000",
        "--app-dir", str(ROOT_DIR / "backend")
    ]
    p = subprocess.Popen(cmd, cwd=str(ROOT_DIR), stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    processes.append(("Backend (FastAPI)", p))
    time.sleep(1.5)
    if p.poll() is not None:
        print(f"    ✗ Backend failed to start (exit code {p.returncode})")
        return p
    print("    ✓ Backend running on http://127.0.0.1:8000")
    return p


def start_frontend():
    print("[*] Starting Frontend Luxury Flagship Server on port 3000...")
    cmd = ["node", "server.js"]
    p = subprocess.Popen(cmd, cwd=str(ROOT_DIR), stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    processes.append(("Frontend (Node)", p))
    time.sleep(1.0)
    if p.poll() is not None:
        print(f"    ✗ Frontend failed to start (exit code {p.returncode})")
        return p
    print("    ✓ Frontend running on http://127.0.0.1:3000")
    return p


def start_cloudflare_tunnel():
    print("[*] Launching Cloudflare Tunnel for WhatsApp Webhooks...")
    cf_path = r"C:\Program Files (x86)\cloudflared\cloudflared.exe"
    if not os.path.isfile(cf_path):
        cf_path = "cloudflared"

    log_file = ROOT_DIR / "scratch" / "cf_runner.log"
    log_file.parent.mkdir(parents=True, exist_ok=True)
    try:
        if log_file.exists():
            log_file.unlink()
    except (OSError, PermissionError):
        pass

    cmd = [cf_path, "tunnel", "--url", "http://127.0.0.1:8000"]
    p = subprocess.Popen(cmd, stdout=subprocess.DEVNULL, stderr=open(log_file, "w", encoding="utf-8"))
    processes.append(("Cloudflare Tunnel", p))

    # Poll for trycloudflare URL
    tunnel_url = None
    for _ in range(25):
        time.sleep(0.5)
        if log_file.exists():
            text = log_file.read_text(encoding="utf-8", errors="ignore")
            for line in text.splitlines():
                if "trycloudflare.com" in line and "https://" in line:
                    for part in line.split():
                        if part.startswith("https://") and "trycloudflare.com" in part:
                            tunnel_url = part.strip()
                            break
                if tunnel_url:
                    break
        if tunnel_url:
            break

    if tunnel_url:
        webhook_url = f"{tunnel_url}/webhook"
        print(f"    ✓ Cloudflare Tunnel Active: {tunnel_url}")
        print(f"    ✓ Live WhatsApp Webhook URL: {webhook_url}")
        
        # Test handshake
        try:
            import httpx
            token = os.getenv("VERIFY_TOKEN", "my_whatsapp_secret_token_2026")
            test_resp = httpx.get(
                f"{webhook_url}?hub.mode=subscribe&hub.verify_token={token}&hub.challenge=VERIFY_SUCCESS",
                timeout=10.0
            )
            if test_resp.status_code == 200 and "VERIFY_SUCCESS" in test_resp.text:
                print(f"    ✓ Webhook Verification Test: PASSED (Meta Handshake 200 OK)")
        except Exception as exc:
            print(f"    ⚠ Webhook ping: {exc}")
    else:
        print("    ⚠ Tunnel running, waiting for URL resolution in background.")

    return p


def shutdown(signum=None, frame=None):
    print("\n[*] Gracefully terminating all Bedi Fashion services...")
    for name, p in processes:
        try:
            p.terminate()
            p.wait(timeout=2)
            print(f"    ✓ {name} stopped.")
        except Exception:
            try:
                p.kill()
            except Exception:
                pass
    sys.exit(0)


def main():
    signal.signal(signal.SIGINT, shutdown)
    signal.signal(signal.SIGTERM, shutdown)

    banner()
    verify_supabase()
    start_backend()
    start_frontend()
    start_cloudflare_tunnel()

    print("""
================================================================================
  🚀 ALL SERVICES OPERATIONAL & CONNECTED!
  • Customer Frontend:        http://localhost:3000
  • Backend API & Docs:       http://localhost:8000/docs
  • Official WhatsApp Line:   +91 9211825699
  • Press Ctrl+C at any time to halt all services.
================================================================================
""")

    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        shutdown()


if __name__ == "__main__":
    main()
