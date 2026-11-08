"""Chat orchestration service managing conversation flow."""

import re
from pathlib import Path
from typing import Any, Dict, List, Optional
from sqlalchemy import select

from app.config import Settings, get_settings
from app.core.logging import get_logger
from app.db.models import MessageRecord
from app.db.session import get_session_factory
from app.services.catalog_menu import CATEGORY_MAP, CatalogMenuService
from app.services.consent import check_consent_command, is_user_opted_out, set_user_opt_out
from app.services.handoff import is_handoff_active, is_handoff_requested, set_handoff_active
from app.services.knowledge import retrieve
from app.services.llm import GeminiProvider, LLMProvider
from app.services.whatsapp import WhatsAppService

logger = get_logger(__name__)


def load_system_prompt() -> str:
    """Load system instructions from prompts/system_prompt.md.

    Returns:
        str: Bot system prompt text.
    """
    project_root = Path(__file__).resolve().parent.parent.parent
    prompt_file = project_root / "prompts" / "system_prompt.md"
    if prompt_file.is_file():
        try:
            return prompt_file.read_text(encoding="utf-8").strip()
        except Exception as exc:
            logger.warning("Failed to read system_prompt.md: %s", exc)
    return "You are an intelligent, friendly, and helpful WhatsApp AI assistant."


class ChatService:
    """Orchestrates incoming message processing, prompt construction, and response delivery."""

    def __init__(
        self,
        llm_provider: Optional[LLMProvider] = None,
        whatsapp_service: Optional[WhatsAppService] = None,
        settings: Optional[Settings] = None,
    ) -> None:
        """Initialize chat service with dependencies.

        Args:
            llm_provider: LLM generation provider.
            whatsapp_service: WhatsApp messaging provider.
            settings: Configuration settings.
        """
        self.settings = settings or get_settings()
        self.llm = llm_provider or GeminiProvider(self.settings)
        self.whatsapp = whatsapp_service or WhatsAppService(self.settings)
        self.system_prompt = load_system_prompt()

    async def _load_history(self, sender_id: str) -> List[MessageRecord]:
        """Load recent conversation history for sender up to configured limit.

        Args:
            sender_id: The user WhatsApp phone number.

        Returns:
            List[MessageRecord]: History messages in chronological order.
        """
        try:
            factory = get_session_factory()
            async with factory() as session:
                query = (
                    select(MessageRecord)
                    .where(MessageRecord.sender_id == sender_id)
                    .order_by(MessageRecord.created_at.desc())
                    .limit(self.settings.max_history_messages)
                )
                result = await session.execute(query)
                records = list(result.scalars().all())
                records.reverse()
                return records
        except Exception as exc:
            logger.warning("Could not load history for %s: %s", sender_id, exc)
            return []

    async def _save_message(
        self,
        sender_id: str,
        role: str,
        content: str,
        message_id: Optional[str] = None,
    ) -> None:
        """Save a message record to the database.

        Args:
            sender_id: Sender WhatsApp ID.
            role: 'user' or 'assistant'.
            content: Message body.
            message_id: Optional WhatsApp message id.
        """
        try:
            factory = get_session_factory()
            async with factory() as session:
                record = MessageRecord(
                    sender_id=sender_id,
                    role=role,
                    content=content,
                    message_id=message_id,
                )
                session.add(record)
                await session.commit()
        except Exception as exc:
            logger.warning("Could not save message record for %s: %s", sender_id, exc)

    def _build_prompt(
        self,
        incoming_message: str,
        history: List[MessageRecord],
        knowledge_chunks: List[Dict[str, Any]],
    ) -> str:
        """Construct full contextual prompt including history and RAG context.

        Args:
            incoming_message: Latest user query.
            history: List of recent historical MessageRecords.
            knowledge_chunks: Relevant RAG documents.

        Returns:
            str: Assembled prompt text for LLM.
        """
        parts: List[str] = []

        if knowledge_chunks:
            parts.append("### Relevant Context:")
            for chunk in knowledge_chunks:
                parts.append(str(chunk))
            parts.append("")

        if history:
            parts.append("### Conversation History:")
            for record in history:
                speaker = "User" if record.role == "user" else "Assistant"
                parts.append(f"{speaker}: {record.content}")
            parts.append("")

        parts.append(f"User: {incoming_message}")
        parts.append("Assistant:")
        return "\n".join(parts)

    async def handle_incoming_message(
        self,
        sender_id: str,
        message_text: str,
        message_id: Optional[str] = None,
        interactive_id: Optional[str] = None,
    ) -> bool:
        """Orchestrate end-to-end incoming WhatsApp message lifecycle.

        Pipeline:
        1. Mark incoming message as read.
        2. Evaluate consent opt-in / opt-out commands.
        3. Check human handoff triggers and active state.
        4. Evaluate interactive button / list menu actions.
        5. For general text inquiries, query LLM and attach interactive menu.

        Args:
            sender_id: WhatsApp phone number / sender ID.
            message_text: Message content from user.
            message_id: Optional WhatsApp message identifier.
            interactive_id: Optional row/button ID when selected from a menu.

        Returns:
            bool: True if processed and replied successfully; False otherwise.
        """
        logger.info("Processing incoming message from %s (text: %s, interactive_id: %s)", sender_id, message_text, interactive_id)

        # 1. Mark as read
        if message_id:
            try:
                await self.whatsapp.mark_as_read(message_id)
            except Exception as exc:
                logger.warning("Could not mark message %s as read: %s", message_id, exc)

        # 2. Check consent commands
        is_consent, action = check_consent_command(message_text)
        if is_consent:
            if action == "opt_out":
                await set_user_opt_out(sender_id, True)
                await self._save_message(sender_id, "user", message_text, message_id)
                msg = "You have been unsubscribed from WhatsApp messages. Reply START at any time to opt back in."
                await self._save_message(sender_id, "assistant", msg)
                return await self.whatsapp.send_text(to_number=sender_id, message=msg)
            elif action == "opt_in":
                await set_user_opt_out(sender_id, False)
                await self._save_message(sender_id, "user", message_text, message_id)
                msg = "Welcome back! You have opted in. How can I assist you today?"
                await self._save_message(sender_id, "assistant", msg)
                return await self.whatsapp.send_text(to_number=sender_id, message=msg)

        if await is_user_opted_out(sender_id):
            logger.info("User %s is currently opted out. Suppressing response.", sender_id)
            return True

        # 3. Check human handoff
        if is_handoff_requested(message_text):
            await set_handoff_active(sender_id, True)
            await self._save_message(sender_id, "user", message_text, message_id)
            msg = "I have transferred you to a human agent. A team member will assist you shortly. Reply 'bot' to resume chatting with AI."
            await self._save_message(sender_id, "assistant", msg)
            return await self.whatsapp.send_text(to_number=sender_id, message=msg)

        if await is_handoff_active(sender_id):
            if message_text.strip().lower() in {"bot", "resume", "ai"}:
                await set_handoff_active(sender_id, False)
                await self._save_message(sender_id, "user", message_text, message_id)
                msg = "Human handoff ended. How can I help you today?"
                await self._save_message(sender_id, "assistant", msg)
                return await self.whatsapp.send_text(to_number=sender_id, message=msg)
            logger.info("User %s is currently handed off to a human. Suppressing AI reply.", sender_id)
            return True

        # 4. Interactive Dropdown Menus & Actions
        clean_text = message_text.lower().strip()
        act_id = (interactive_id or "").strip()

        # 4A. Prioritize explicit interactive button/row ID selections
        if act_id:
            if act_id == "menu_main":
                menu_payload = CatalogMenuService.get_main_menu()
                await self._save_message(sender_id, "user", message_text or "Browse Catalog", message_id)
                await self._save_message(sender_id, "assistant", "Sent Interactive Catalog Menu")
                return await self.whatsapp.send_interactive_list(to_number=sender_id, **menu_payload)

            if act_id in CATEGORY_MAP:
                cat_menu = await CatalogMenuService.get_category_menu(act_id)
                if cat_menu:
                    await self._save_message(sender_id, "user", message_text or act_id, message_id)
                    await self._save_message(sender_id, "assistant", f"Sent Interactive Category Menu: {act_id}")
                    return await self.whatsapp.send_interactive_list(to_number=sender_id, **cat_menu)

            if act_id.startswith("p_"):
                try:
                    prod_id = int(act_id[2:])
                    prod_menu = await CatalogMenuService.get_product_detail_menu(prod_id)
                    if prod_menu:
                        await self._save_message(sender_id, "user", message_text or act_id, message_id)
                        await self._save_message(sender_id, "assistant", f"Sent Product Details: {prod_id}")
                        return await self.whatsapp.send_interactive_list(to_number=sender_id, **prod_menu)
                except ValueError:
                    pass

            if act_id.startswith("add_cart_"):
                try:
                    prod_id = int(act_id[9:])
                    cart_res = await CatalogMenuService.add_to_cart(sender_id, prod_id)
                    if cart_res:
                        await self._save_message(sender_id, "user", message_text or act_id, message_id)
                        await self._save_message(sender_id, "assistant", f"Added Product {prod_id} to Cart")
                        return await self.whatsapp.send_interactive_list(to_number=sender_id, **cart_res)
                except ValueError:
                    pass

            if act_id == "view_cart":
                cart_menu = await CatalogMenuService.get_cart_menu(sender_id)
                await self._save_message(sender_id, "user", message_text or act_id, message_id)
                await self._save_message(sender_id, "assistant", "Sent Cart Summary")
                return await self.whatsapp.send_interactive_list(to_number=sender_id, **cart_menu)

            if act_id == "clear_cart":
                clear_res = await CatalogMenuService.clear_cart(sender_id)
                await self._save_message(sender_id, "user", message_text or act_id, message_id)
                await self._save_message(sender_id, "assistant", "Cleared Cart")
                return await self.whatsapp.send_interactive_list(to_number=sender_id, **clear_res)

            if act_id == "checkout":
                checkout_res = await CatalogMenuService.checkout_order(sender_id)
                await self._save_message(sender_id, "user", message_text or act_id, message_id)
                await self._save_message(sender_id, "assistant", "Checked Out Order")
                return await self.whatsapp.send_interactive_list(to_number=sender_id, **checkout_res)

            if act_id == "b2b_inquiry":
                b2b_res = CatalogMenuService.get_b2b_inquiry_menu()
                await self._save_message(sender_id, "user", message_text or act_id, message_id)
                await self._save_message(sender_id, "assistant", "Sent B2B Inquiry Menu")
                return await self.whatsapp.send_interactive_list(to_number=sender_id, **b2b_res)

        # 4B. For free text without explicit interactive_id:
        if clean_text in {"hi", "hello", "hey", "menu", "catalog", "catalogue", "products", "options", "start", "swagat"} or any(
            re.search(rf"\b{re.escape(w)}\b", clean_text)
            for w in ["menu", "catalog", "catalogue", "category", "categories", "drop down", "dropdown", "tab"]
        ):
            menu_payload = CatalogMenuService.get_main_menu()
            await self._save_message(sender_id, "user", message_text, message_id)
            await self._save_message(sender_id, "assistant", "Sent Interactive Catalog Menu")
            return await self.whatsapp.send_interactive_list(to_number=sender_id, **menu_payload)

        if clean_text in {"cart", "view cart", "bag"}:
            cart_menu = await CatalogMenuService.get_cart_menu(sender_id)
            await self._save_message(sender_id, "user", message_text, message_id)
            await self._save_message(sender_id, "assistant", "Sent Cart Summary")
            return await self.whatsapp.send_interactive_list(to_number=sender_id, **cart_menu)

        # 5. Free-form text query: Query LLM for advice/questions
        knowledge_chunks = await retrieve(message_text)
        history = await self._load_history(sender_id)
        prompt = self._build_prompt(
            incoming_message=message_text,
            history=history,
            knowledge_chunks=knowledge_chunks,
        )

        reply = await self.llm.generate_reply(
            prompt=prompt,
            system_prompt=self.system_prompt,
        )

        await self._save_message(sender_id=sender_id, role="user", content=message_text, message_id=message_id)
        await self._save_message(sender_id=sender_id, role="assistant", content=reply)

        return await self.whatsapp.send_text(to_number=sender_id, message=reply)


_GLOBAL_CHAT_SERVICE: Optional[ChatService] = None


def get_chat_service() -> ChatService:
    """Retrieve singleton ChatService instance for dependency injection.

    Returns:
        ChatService: The configured chat orchestrator.
    """
    global _GLOBAL_CHAT_SERVICE
    if _GLOBAL_CHAT_SERVICE is None:
        _GLOBAL_CHAT_SERVICE = ChatService()
    return _GLOBAL_CHAT_SERVICE
