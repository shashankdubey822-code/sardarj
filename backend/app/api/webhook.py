"""Webhook router handling Meta WhatsApp Cloud API verification and event ingestion."""

import json
from typing import Any, Dict, Optional

from fastapi import APIRouter, BackgroundTasks, Depends, Header, HTTPException, Query, Request
from fastapi.responses import JSONResponse, PlainTextResponse

from app.config import Settings, get_settings
from app.core.logging import get_logger
from app.core.security import verify_payload_signature, verify_webhook_token
from app.services.chat import ChatService, get_chat_service

logger = get_logger(__name__)

router = APIRouter(tags=["webhook"])


@router.get("/webhook", response_class=PlainTextResponse)
async def verify_webhook(
    mode: Optional[str] = Query(None, alias="hub.mode"),
    token: Optional[str] = Query(None, alias="hub.verify_token"),
    challenge: Optional[str] = Query(None, alias="hub.challenge"),
    settings: Settings = Depends(get_settings),
) -> PlainTextResponse:
    """Handle Meta WhatsApp Webhook verification handshake.

    Validates that hub.mode is 'subscribe' and hub.verify_token matches
    the configured verification token using constant-time comparison.

    Args:
        mode: Handshake mode parameter (hub.mode).
        token: Handshake verification token (hub.verify_token).
        challenge: Challenge string from Meta to echo back upon success (hub.challenge).
        settings: Application settings dependency.

    Returns:
        PlainTextResponse: The challenge string with HTTP 200 on success.

    Raises:
        HTTPException: 400 if required query parameters are missing.
        HTTPException: 403 if mode or token does not match.
    """
    if not mode or not token or challenge is None:
        logger.warning("Webhook verification failed: Missing required query parameters.")
        raise HTTPException(
            status_code=400,
            detail="Missing required query parameters",
        )

    if not verify_webhook_token(mode, token, settings.verify_token):
        logger.warning("Webhook verification failed: Token mismatch or invalid mode.")
        raise HTTPException(
            status_code=403,
            detail="Verification token mismatch or invalid mode",
        )

    logger.info("Webhook verification handshake successful.")
    return PlainTextResponse(content=challenge, status_code=200)


@router.post("/webhook", response_class=JSONResponse)
async def receive_webhook(
    request: Request,
    background_tasks: BackgroundTasks,
    x_hub_signature_256: Optional[str] = Header(None, alias="X-Hub-Signature-256"),
    settings: Settings = Depends(get_settings),
    chat_service: ChatService = Depends(get_chat_service),
) -> JSONResponse:
    """Receive incoming webhook events from Meta WhatsApp Cloud API.

    Verifies the HMAC-SHA256 signature when META_APP_SECRET is configured,
    logs the event metadata with secret redaction, acknowledges receipt with HTTP 200,
    and dispatches incoming messages to the ChatService background worker.

    Args:
        request: FastAPI raw request to access raw bytes for signature verification.
        background_tasks: FastAPI background tasks queue.
        x_hub_signature_256: Meta's signature header (sha256=...).
        settings: Application settings dependency.
        chat_service: Chat orchestration service dependency.

    Returns:
        JSONResponse: Acknowledgment payload with HTTP 200.

    Raises:
        HTTPException: 403 if signature verification fails.
    """
    raw_body = await request.body()

    # Verify signature if META_APP_SECRET is set
    if settings.meta_app_secret:
        if not verify_payload_signature(raw_body, x_hub_signature_256, settings.meta_app_secret):
            logger.warning("Incoming webhook signature verification failed.")
            raise HTTPException(
                status_code=403,
                detail="Invalid payload signature",
            )

    try:
        payload: Dict[str, Any] = json.loads(raw_body.decode("utf-8")) if raw_body else {}
    except (json.JSONDecodeError, UnicodeDecodeError):
        logger.error("Failed to parse incoming webhook payload as JSON.")
        return JSONResponse(status_code=200, content={"status": "invalid_json"})

    entries = payload.get("entry", [])
    if not entries:
        logger.debug("Received webhook payload without entries.")
        return JSONResponse(status_code=200, content={"status": "received"})

    for entry in entries:
        changes = entry.get("changes", [])
        for change in changes:
            value = change.get("value", {})

            # 1. Ignore delivery / read receipt status updates
            statuses = value.get("statuses")
            if statuses:
                for status in statuses:
                    logger.debug(
                        "Status receipt: recipient=%s, status=%s",
                        status.get("recipient_id"),
                        status.get("status"),
                    )
                continue

            # 2. Process incoming messages
            messages = value.get("messages", [])
            for msg in messages:
                sender_id = msg.get("from")
                msg_type = msg.get("type")
                msg_id = msg.get("id")

                body = ""
                interactive_id: Optional[str] = None
                if msg_type == "text":
                    body = msg.get("text", {}).get("body", "").strip()
                elif msg_type == "interactive":
                    interactive = msg.get("interactive", {})
                    itype = interactive.get("type")
                    if itype == "list_reply":
                        list_reply = interactive.get("list_reply", {})
                        body = list_reply.get("title", "").strip()
                        interactive_id = list_reply.get("id", "").strip()
                    elif itype == "button_reply":
                        button_reply = interactive.get("button_reply", {})
                        body = button_reply.get("title", "").strip()
                        interactive_id = button_reply.get("id", "").strip()
                elif msg_type == "button":
                    body = msg.get("button", {}).get("text", "").strip()
                    interactive_id = msg.get("button", {}).get("payload", "").strip() or None

                if (body or interactive_id) and sender_id:
                    logger.info("Enqueuing message from %s (type: %s, interactive_id: %s, id: %s)", sender_id, msg_type, interactive_id, msg_id)
                    background_tasks.add_task(
                        chat_service.handle_incoming_message,
                        sender_id=sender_id,
                        message_text=body or interactive_id or "",
                        message_id=msg_id,
                        interactive_id=interactive_id,
                    )
                else:
                    logger.info("Received unsupported message type '%s' from %s", msg_type, sender_id)
                    if sender_id:
                        background_tasks.add_task(
                            chat_service.whatsapp.send_text,
                            to_number=sender_id,
                            message="Sorry, I can only understand text messages at the moment!",
                        )

    return JSONResponse(status_code=200, content={"status": "received"})
