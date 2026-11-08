import os
import logging
from typing import Optional, List, Dict, Any
from datetime import datetime
from dotenv import load_dotenv
from fastapi import FastAPI, Request, Query, HTTPException, BackgroundTasks
from fastapi.responses import PlainTextResponse, JSONResponse, HTMLResponse
import httpx
from google import genai
from google.genai import errors as genai_errors

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("whatsapp_bot")

# Load environment variables
load_dotenv()

WHATSAPP_TOKEN = os.getenv("WHATSAPP_TOKEN")
PHONE_NUMBER_ID = os.getenv("PHONE_NUMBER_ID", "1389083964296832")
VERIFY_TOKEN = os.getenv("VERIFY_TOKEN", "my_whatsapp_secret_token_2026")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-3.5-flash-lite")
GRAPH_API_VERSION = os.getenv("GRAPH_API_VERSION", "v25.0")

# In-memory store for recent activity to display on web interface
recent_events: List[Dict[str, Any]] = []

def record_event(event_type: str, details: Dict[str, Any]):
    recent_events.append({
        "timestamp": datetime.now().strftime("%H:%M:%S"),
        "type": event_type,
        **details
    })
    # Keep only last 50 events
    if len(recent_events) > 50:
        recent_events.pop(0)

# Initialize Gemini Client
gemini_client = None
if GEMINI_API_KEY:
    try:
        gemini_client = genai.Client(api_key=GEMINI_API_KEY)
        logger.info("Gemini Client initialized successfully.")
    except Exception as e:
        logger.error(f"Failed to initialize Gemini Client: {e}")

app = FastAPI(
    title="WhatsApp Cloud API Gemini Chatbot",
    description="FastAPI chatbot powered by Google Gemini and Meta WhatsApp Cloud API",
    version="1.1.0"
)


async def generate_gemini_reply(prompt: str) -> str:
    """Generate a response using the Gemini API asynchronously."""
    if not gemini_client:
        return "I'm sorry, the Gemini AI service is currently unconfigured."

    try:
        try:
            response = await gemini_client.aio.models.generate_content(
                model=GEMINI_MODEL,
                contents=prompt
            )
            return response.text or "I received your message, but couldn't generate a text response."
        except genai_errors.ServerError as se:
            logger.warning(f"Model {GEMINI_MODEL} server error ({se}), attempting fallback to gemini-3.8-flash...")
            fallback_response = await gemini_client.aio.models.generate_content(
                model="gemini-3.8-flash",
                contents=prompt
            )
            return fallback_response.text or "I received your message, but couldn't generate a text response."
    except Exception as e:
        logger.error(f"Error generating Gemini response: {e}", exc_info=True)
        return f"Error processing message: {str(e)}"


async def send_whatsapp_message(to_number: str, message_body: str) -> bool:
    """
    Sends a text message back to the sender via WhatsApp Cloud API.
    URL: https://graph.facebook.com/{GRAPH_API_VERSION}/{PHONE_NUMBER_ID}/messages
    """
    url = f"https://graph.facebook.com/{GRAPH_API_VERSION}/{PHONE_NUMBER_ID}/messages"
    headers = {
        "Authorization": f"Bearer {WHATSAPP_TOKEN}",
        "Content-Type": "application/json"
    }

    if len(message_body) > 4000:
        message_body = message_body[:3990] + "... [truncated]"

    payload = {
        "messaging_product": "whatsapp",
        "recipient_type": "individual",
        "to": to_number,
        "type": "text",
        "text": {
            "preview_url": False,
            "body": message_body
        }
    }

    try:
        async with httpx.AsyncClient(timeout=15.0) as http_client:
            response = await http_client.post(url, headers=headers, json=payload)
            if response.status_code == 200:
                logger.info(f"Successfully sent WhatsApp message to {to_number}: {response.json()}")
                record_event("whatsapp_sent", {
                    "to": to_number,
                    "body": message_body,
                    "status": "success",
                    "response": response.json()
                })
                return True
            else:
                logger.error(f"Failed to send WhatsApp message to {to_number}. Status: {response.status_code}, Body: {response.text}")
                record_event("whatsapp_send_failed", {
                    "to": to_number,
                    "body": message_body,
                    "status": f"HTTP {response.status_code}",
                    "response": response.text
                })
                return False
    except Exception as e:
        logger.error(f"HTTP exception sending WhatsApp message: {e}", exc_info=True)
        record_event("whatsapp_send_error", {
            "to": to_number,
            "error": str(e)
        })
        return False


async def process_incoming_message(sender_id: str, incoming_text: str):
    """
    Background worker that fetches Gemini's response and sends it to WhatsApp.
    """
    logger.info(f"Processing message from {sender_id}: '{incoming_text}'")
    record_event("incoming_whatsapp", {
        "from": sender_id,
        "message": incoming_text
    })

    ai_reply = await generate_gemini_reply(incoming_text)
    logger.info(f"Gemini reply generated for {sender_id}: '{ai_reply[:60]}...'")
    
    await send_whatsapp_message(to_number=sender_id, message_body=ai_reply)


# --- API Endpoints ---

@app.get("/webhook")
async def verify_webhook(
    mode: Optional[str] = Query(None, alias="hub.mode"),
    token: Optional[str] = Query(None, alias="hub.verify_token"),
    challenge: Optional[str] = Query(None, alias="hub.challenge"),
):
    """Handles Meta's Webhook verification handshake."""
    logger.info(f"Received webhook verification request: mode={mode}, token={token}")
    if mode and token:
        if mode == "subscribe" and token == VERIFY_TOKEN:
            logger.info("Webhook verification SUCCESSFUL!")
            record_event("webhook_verified", {"status": "Handshake 200 OK from Meta"})
            return PlainTextResponse(content=challenge or "", status_code=200)
        else:
            logger.warning("Webhook verification FAILED: Token mismatch or invalid mode.")
            raise HTTPException(status_code=403, detail="Verification token mismatch")

    raise HTTPException(status_code=400, detail="Missing required query parameters")


@app.post("/webhook")
async def receive_webhook(request: Request, background_tasks: BackgroundTasks):
    """
    Receives incoming WhatsApp Cloud API notifications.
    Automatically replies with Gemini whenever anyone messages the official number.
    """
    try:
        payload = await request.json()
    except Exception:
        logger.error("Failed to parse incoming webhook JSON.")
        return JSONResponse(status_code=200, content={"status": "invalid_json"})

    entries = payload.get("entry", [])
    if not entries:
        return JSONResponse(status_code=200, content={"status": "no_entries"})

    for entry in entries:
        changes = entry.get("changes", [])
        for change in changes:
            value = change.get("value", {})

            # 1. Ignore background delivery/read receipts
            statuses = value.get("statuses")
            if statuses:
                for status in statuses:
                    logger.info(f"Status update: recipient={status.get('recipient_id')}, status={status.get('status')}")
                    record_event("status_update", {
                        "recipient": status.get('recipient_id'),
                        "status": status.get('status')
                    })
                continue

            # 2. Process incoming messages
            messages = value.get("messages", [])
            for msg in messages:
                sender_id = msg.get("from")
                msg_type = msg.get("type")

                if msg_type == "text":
                    body = msg.get("text", {}).get("body", "").strip()
                    if body and sender_id:
                        logger.info(f"Received text message from {sender_id}: {body}")
                        background_tasks.add_task(process_incoming_message, sender_id, body)
                else:
                    logger.info(f"Received non-text message type '{msg_type}' from {sender_id}.")
                    if sender_id:
                        background_tasks.add_task(
                            send_whatsapp_message,
                            sender_id,
                            "Sorry, I can only understand text messages at the moment!"
                        )

    return JSONResponse(status_code=200, content={"status": "received"})


# --- Direct Chat & Testing Endpoints ---

@app.post("/api/chat")
async def direct_chat(request: Request):
    """Chat directly with the Gemini model through the browser UI."""
    data = await request.json()
    user_message = data.get("message", "").strip()
    if not user_message:
        return {"reply": "Please enter a message."}
    
    reply = await generate_gemini_reply(user_message)
    record_event("web_chat", {"user": user_message, "ai": reply})
    return {"reply": reply}


@app.post("/api/send-whatsapp")
async def direct_send_whatsapp(request: Request):
    """Directly test sending a WhatsApp message to any phone number using the configured API credentials."""
    data = await request.json()
    to_number = data.get("to", "").strip().replace("+", "").replace(" ", "").replace("-", "")
    message_text = data.get("message", "").strip()

    if not to_number or not message_text:
        return {"success": False, "error": "Phone number and message are required."}

    success = await send_whatsapp_message(to_number=to_number, message_body=message_text)
    return {"success": success}


@app.get("/api/events")
async def get_events():
    """Retrieve live feed of webhook events and messages."""
    return {"events": recent_events}


@app.get("/")
async def web_interface(request: Request):
    """WhatsApp Web style testing interface or JSON status for API requests."""
    accept = request.headers.get("accept", "")
    if "application/json" in accept or "text/html" not in accept:
        return JSONResponse({"status": "online", "service": "WhatsApp Cloud API Gemini Chatbot"})
    return HTMLResponse(content="""
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>WhatsApp Gemini Bot - Live Testing Interface</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
        body { background: #0c1317; color: #e9edef; display: flex; height: 100vh; overflow: hidden; }
        .sidebar { width: 400px; background: #111b21; border-right: 1px solid #222e35; display: flex; flex-direction: column; }
        .sidebar-header { padding: 15px 20px; background: #202c33; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #222e35; }
        .sidebar-header h2 { font-size: 16px; color: #00a884; }
        .status-badge { background: #00a88422; color: #00a884; padding: 4px 10px; border-radius: 12px; font-size: 12px; font-weight: bold; border: 1px solid #00a88444; }
        .system-info { padding: 15px 20px; font-size: 12px; color: #8696a0; border-bottom: 1px solid #222e35; line-height: 1.6; }
        .system-info strong { color: #d1d7db; }
        .feed-container { flex: 1; overflow-y: auto; padding: 15px 20px; }
        .feed-title { font-size: 12px; text-transform: uppercase; color: #8696a0; letter-spacing: 0.5px; margin-bottom: 10px; }
        .feed-item { background: #182229; border-radius: 8px; padding: 10px 12px; margin-bottom: 10px; font-size: 12px; border-left: 3px solid #00a884; }
        .feed-item.error { border-left-color: #ea4335; }
        .feed-time { color: #8696a0; font-size: 10px; margin-bottom: 4px; }
        
        .chat-container { flex: 1; display: flex; flex-direction: column; background: #0b141a; background-image: radial-gradient(#1f2c34 1px, transparent 1px); background-size: 20px 20px; }
        .chat-header { padding: 15px 25px; background: #202c33; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #222e35; }
        .chat-header .title { font-size: 16px; font-weight: 600; color: #e9edef; }
        .chat-header .subtitle { font-size: 12px; color: #8696a0; }
        .messages-area { flex: 1; overflow-y: auto; padding: 20px 30px; display: flex; flex-direction: column; gap: 12px; }
        .msg { max-width: 65%; padding: 10px 14px; border-radius: 8px; font-size: 14px; line-height: 1.45; word-wrap: break-word; position: relative; }
        .msg.user { align-self: flex-end; background: #005c4b; color: #e9edef; border-bottom-right-radius: 2px; }
        .msg.bot { align-self: flex-start; background: #202c33; color: #d1d7db; border-bottom-left-radius: 2px; }
        .msg-time { font-size: 10px; color: #8696a0; text-align: right; margin-top: 4px; }
        
        .chat-input-bar { padding: 15px 25px; background: #202c33; display: flex; gap: 12px; align-items: center; }
        .chat-input { flex: 1; background: #2a3942; border: none; outline: none; border-radius: 8px; padding: 12px 16px; color: #e9edef; font-size: 14px; }
        .chat-input::placeholder { color: #8696a0; }
        .btn-send { background: #00a884; color: #111b21; border: none; outline: none; border-radius: 8px; padding: 12px 20px; font-weight: bold; cursor: pointer; transition: 0.2s; }
        .btn-send:hover { background: #029474; }
        
        .whatsapp-tool { padding: 15px 20px; background: #182229; border-top: 1px solid #222e35; }
        .whatsapp-tool h3 { font-size: 13px; color: #00a884; margin-bottom: 8px; }
        .whatsapp-tool input { width: 100%; background: #2a3942; border: 1px solid #3b4a54; border-radius: 6px; padding: 8px 10px; color: #fff; font-size: 12px; margin-bottom: 6px; outline: none; }
        .whatsapp-tool button { width: 100%; background: #00a884; color: #111b21; border: none; border-radius: 6px; padding: 8px; font-size: 12px; font-weight: bold; cursor: pointer; }
    </style>
</head>
<body>
    <div class="sidebar">
        <div class="sidebar-header">
            <h2>WhatsApp AI Bot</h2>
            <span class="status-badge">● LIVE ONLINE</span>
        </div>
        <div class="system-info">
            <div><strong>Phone Number ID:</strong> 1389083964296832</div>
            <div><strong>Gemini Model:</strong> gemini-3.5-flash-lite</div>
            <div><strong>Meta Webhook:</strong> Verified (Active)</div>
            <div><strong>Webhook Status:</strong> Auto-replying to all senders</div>
        </div>
        
        <div class="feed-container">
            <div class="feed-title">Live Inbound & Outbound Activity</div>
            <div id="activity-feed">
                <div class="feed-item">
                    <div class="feed-time">System Ready</div>
                    <div>Listening for live WhatsApp incoming messages on your official number...</div>
                </div>
            </div>
        </div>

        <div class="whatsapp-tool">
            <h3>Test Send Direct to Any WhatsApp Number</h3>
            <input type="text" id="wa-to" placeholder="Phone Number with Country Code (e.g. 919876543210)">
            <input type="text" id="wa-msg" placeholder="Message content">
            <button onclick="sendDirectWhatsApp()">Send to WhatsApp Device</button>
            <div id="wa-status" style="font-size: 11px; margin-top: 6px; color: #8696a0;"></div>
        </div>
    </div>

    <div class="chat-container">
        <div class="chat-header">
            <div>
                <div class="title">Gemini AI WhatsApp Assistant</div>
                <div class="subtitle">Direct Interactive Chat Testing Mode</div>
            </div>
            <div>
                <span style="font-size: 12px; color: #00a884; font-weight: bold;">⚡ Ready to chat</span>
            </div>
        </div>

        <div class="messages-area" id="messages">
            <div class="msg bot">
                Hello! I am your WhatsApp AI Chatbot powered by Google Gemini. You can type any message below to chat with me directly, or send a message from WhatsApp to your official number!
                <div class="msg-time">Just now</div>
            </div>
        </div>

        <div class="chat-input-bar">
            <input type="text" class="chat-input" id="user-input" placeholder="Type a message to test your Gemini chatbot..." onkeydown="if(event.key==='Enter') sendMessage()">
            <button class="btn-send" onclick="sendMessage()">Send</button>
        </div>
    </div>

    <script>
        async function sendMessage() {
            const input = document.getElementById('user-input');
            const text = input.value.trim();
            if (!text) return;

            input.value = '';
            appendMessage(text, 'user');

            try {
                const response = await fetch('/api/chat', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ message: text })
                });
                const data = await response.json();
                appendMessage(data.reply, 'bot');
            } catch (err) {
                appendMessage('Error: Failed to reach bot backend.', 'bot');
            }
        }

        function appendMessage(text, sender) {
            const container = document.getElementById('messages');
            const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const msgDiv = document.createElement('div');
            msgDiv.className = 'msg ' + sender;
            msgDiv.innerHTML = text.replace(/\\n/g, '<br>') + '<div class="msg-time">' + time + '</div>';
            container.appendChild(msgDiv);
            container.scrollTop = container.scrollHeight;
        }

        async function sendDirectWhatsApp() {
            const to = document.getElementById('wa-to').value.trim();
            const msg = document.getElementById('wa-msg').value.trim();
            const statusDiv = document.getElementById('wa-status');

            if (!to || !msg) {
                statusDiv.innerText = 'Please enter both phone number and message.';
                statusDiv.style.color = '#ea4335';
                return;
            }

            statusDiv.innerText = 'Sending to ' + to + '...';
            statusDiv.style.color = '#8696a0';

            try {
                const res = await fetch('/api/send-whatsapp', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ to: to, message: msg })
                });
                const data = await res.json();
                if (data.success) {
                    statusDiv.innerText = '✓ Message delivered to WhatsApp!';
                    statusDiv.style.color = '#00a884';
                    document.getElementById('wa-msg').value = '';
                } else {
                    statusDiv.innerText = '✗ Failed: ' + (data.error || 'Check server logs.');
                    statusDiv.style.color = '#ea4335';
                }
            } catch (err) {
                statusDiv.innerText = '✗ Error: ' + err.message;
                statusDiv.style.color = '#ea4335';
            }
        }

        async function refreshFeed() {
            try {
                const res = await fetch('/api/events');
                const data = await res.json();
                const feed = document.getElementById('activity-feed');
                if (data.events && data.events.length > 0) {
                    feed.innerHTML = '';
                    data.events.slice().reverse().forEach(evt => {
                        const item = document.createElement('div');
                        item.className = 'feed-item' + (evt.type.includes('fail') || evt.type.includes('error') ? ' error' : '');
                        let desc = '';
                        if (evt.type === 'incoming_whatsapp') {
                            desc = '<strong>Incoming WhatsApp from ' + evt.from + ':</strong> ' + evt.message;
                        } else if (evt.type === 'whatsapp_sent') {
                            desc = '<strong>AI Replied to ' + evt.to + ':</strong> ' + evt.body;
                        } else if (evt.type === 'web_chat') {
                            desc = '<strong>Direct Web Chat:</strong> ' + evt.user;
                        } else {
                            desc = evt.type + ': ' + JSON.stringify(evt);
                        }
                        item.innerHTML = '<div class="feed-time">' + evt.timestamp + ' • ' + evt.type + '</div>' + desc;
                        feed.appendChild(item);
                    });
                }
            } catch (e) {}
        }

        setInterval(refreshFeed, 2000);
    </script>
</body>
</html>
    """)
