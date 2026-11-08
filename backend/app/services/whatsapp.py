"""WhatsApp Cloud API interaction service."""

from typing import Any, Dict, List, Optional
import httpx

from app.config import Settings, get_settings
from app.core.logging import get_logger

logger = get_logger(__name__)

MAX_WHATSAPP_MESSAGE_LENGTH = 4000


def split_message(content: str, max_length: int = MAX_WHATSAPP_MESSAGE_LENGTH) -> List[str]:
    """Split a message into chunks if it exceeds the maximum allowed length.

    Args:
        content: The text content to split.
        max_length: Maximum allowed character length per segment.

    Returns:
        List[str]: Chunks within the allowed size limit.
    """
    if len(content) <= max_length:
        return [content]

    chunks: List[str] = []
    current_chunk: List[str] = []
    current_len = 0

    paragraphs = content.split("\n\n")
    for para in paragraphs:
        if current_len + len(para) + 2 <= max_length:
            current_chunk.append(para)
            current_len += len(para) + 2
        else:
            if current_chunk:
                chunks.append("\n\n".join(current_chunk))
                current_chunk = []
                current_len = 0

            # If a single paragraph exceeds max_length, split by lines or characters
            if len(para) > max_length:
                for i in range(0, len(para), max_length):
                    chunks.append(para[i : i + max_length])
            else:
                current_chunk.append(para)
                current_len += len(para) + 2

    if current_chunk:
        chunks.append("\n\n".join(current_chunk))

    return chunks


class WhatsAppService:
    """Service for interacting with Meta WhatsApp Cloud API."""

    def __init__(self, settings: Optional[Settings] = None) -> None:
        """Initialize WhatsApp service with configuration settings.

        Args:
            settings: Optional settings instance. Defaults to cached settings.
        """
        self.settings = settings or get_settings()
        # Resolve WABA ID to Phone Number ID if WABA was entered
        phone_id = self.settings.phone_number_id
        if phone_id == "1651591733131359":
            phone_id = "1373460992523647"
        self.phone_number_id = phone_id
        self.base_url = (
            f"https://graph.facebook.com/{self.settings.graph_api_version}/"
            f"{phone_id}/messages"
        )

    async def send_text(self, to_number: str, message: str) -> bool:
        """Send a text message via WhatsApp Cloud API, splitting into chunks if necessary.

        Args:
            to_number: Recipient WhatsApp phone number with country code.
            message: Text message body.

        Returns:
            bool: True if all message segments were dispatched successfully; False otherwise.
        """
        chunks = split_message(message)
        headers = {
            "Authorization": f"Bearer {self.settings.whatsapp_token}",
            "Content-Type": "application/json",
        }

        async with httpx.AsyncClient(timeout=15.0) as client:
            for chunk in chunks:
                payload = {
                    "messaging_product": "whatsapp",
                    "recipient_type": "individual",
                    "to": to_number,
                    "type": "text",
                    "text": {"preview_url": False, "body": chunk},
                }
                try:
                    response = await client.post(self.base_url, headers=headers, json=payload)
                    if response.status_code != 200:
                        logger.error(
                            "Failed to send message to %s: HTTP %s - %s",
                            to_number,
                            response.status_code,
                            response.text,
                        )
                        return False
                except Exception as exc:
                    logger.error("Error communicating with WhatsApp Cloud API: %s", exc)
                    return False

        return True

    async def send_interactive_list(
        self,
        to_number: str,
        body_text: str,
        button_label: str,
        sections: List[Dict[str, Any]],
        header_text: Optional[str] = None,
        footer_text: Optional[str] = None,
    ) -> bool:
        """Send a WhatsApp interactive scrollable list menu.

        Args:
            to_number: Recipient WhatsApp phone number.
            body_text: Main message text.
            button_label: Label on the list menu button.
            sections: List of sections with titles and rows.
            header_text: Optional header text.
            footer_text: Optional footer text.

        Returns:
            bool: True if delivered; False otherwise.
        """
        headers = {
            "Authorization": f"Bearer {self.settings.whatsapp_token}",
            "Content-Type": "application/json",
        }
        interactive_data: Dict[str, Any] = {
            "type": "list",
            "body": {"text": body_text},
            "action": {
                "button": button_label,
                "sections": sections,
            },
        }
        if header_text:
            interactive_data["header"] = {"type": "text", "text": header_text}
        if footer_text:
            interactive_data["footer"] = {"text": footer_text}

        payload = {
            "messaging_product": "whatsapp",
            "recipient_type": "individual",
            "to": to_number,
            "type": "interactive",
            "interactive": interactive_data,
        }
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                response = await client.post(self.base_url, headers=headers, json=payload)
                if response.status_code != 200:
                    logger.error(
                        "Failed to send interactive list to %s: HTTP %s - %s",
                        to_number,
                        response.status_code,
                        response.text,
                    )
                    return False
                return True
        except Exception as exc:
            logger.error("Error sending interactive list to %s: %s", to_number, exc)
            return False

    async def mark_as_read(self, message_id: str) -> bool:
        """Mark an incoming WhatsApp message as read.

        Args:
            message_id: The WhatsApp incoming message ID (wamid...).

        Returns:
            bool: True if marked as read successfully; False otherwise.
        """
        headers = {
            "Authorization": f"Bearer {self.settings.whatsapp_token}",
            "Content-Type": "application/json",
        }
        payload = {
            "messaging_product": "whatsapp",
            "status": "read",
            "message_id": message_id,
        }
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.post(self.base_url, headers=headers, json=payload)
                return response.status_code == 200
        except Exception as exc:
            logger.error("Failed to mark message %s as read: %s", message_id, exc)
            return False
