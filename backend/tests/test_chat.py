import pytest
import pytest_asyncio
from app.config import Settings
from app.db.session import init_db
from app.services.chat import ChatService
from tests.conftest import MockLLMProvider, MockWhatsAppService


@pytest_asyncio.fixture
async def setup_test_db(test_settings: Settings) -> None:
    """Initialize in-memory test database."""
    await init_db(test_settings.async_database_url)


@pytest.mark.asyncio
async def test_chat_service_normal_message_flow(
    test_settings: Settings,
    setup_test_db: None,
) -> None:
    """Test standard conversation turn: history -> prompt -> LLM -> save -> send."""
    mock_llm = MockLLMProvider(reply="I am here to help you!")
    mock_wa = MockWhatsAppService()
    chat_service = ChatService(
        llm_provider=mock_llm,
        whatsapp_service=mock_wa,
        settings=test_settings,
    )

    sender = "1112223334"
    success = await chat_service.handle_incoming_message(
        sender_id=sender,
        message_text="Do you provide school alteration services?",
        message_id="wamid.12345",
    )

    assert success is True
    # 1. Message marked as read
    assert "wamid.12345" in mock_wa.read_message_ids
    # 2. LLM called with prompt
    assert len(mock_llm.prompts) == 1
    assert "User: Do you provide school alteration services?" in mock_llm.prompts[0]
    # 3. WhatsApp reply sent
    assert len(mock_wa.sent_messages) == 1
    assert mock_wa.sent_messages[0] == (sender, "I am here to help you!")

    # 4. Subsequent message carries history
    mock_llm.reply = "My next answer"
    await chat_service.handle_incoming_message(
        sender_id=sender,
        message_text="What was my previous question?",
        message_id="wamid.12346",
    )
    assert len(mock_llm.prompts) == 2
    assert "Conversation History:" in mock_llm.prompts[1]
    assert "User: Do you provide school alteration services?" in mock_llm.prompts[1]
    assert "Assistant: I am here to help you!" in mock_llm.prompts[1]
    assert "User: What was my previous question?" in mock_llm.prompts[1]


@pytest.mark.asyncio
async def test_chat_service_interactive_menu_flow(
    test_settings: Settings,
    setup_test_db: None,
) -> None:
    """Test interactive drop-down menu flow for categories and cart."""
    mock_llm = MockLLMProvider()
    mock_wa = MockWhatsAppService()
    chat_service = ChatService(
        llm_provider=mock_llm,
        whatsapp_service=mock_wa,
        settings=test_settings,
    )

    sender = "9998887776"

    # 1. Greeting or menu command sends interactive drop-down
    res = await chat_service.handle_incoming_message(sender_id=sender, message_text="menu")
    assert res is True
    assert len(mock_wa.sent_interactive_lists) == 1
    assert mock_wa.sent_interactive_lists[0]["button"] == "Browse Catalog"
    assert len(mock_wa.sent_interactive_lists[0]["sections"][0]["rows"]) <= 10

    # 2. Category selection sends sub-menu
    res2 = await chat_service.handle_incoming_message(
        sender_id=sender,
        message_text="T-Shirts",
        interactive_id="cat_tshirts",
    )
    assert res2 is True
    assert len(mock_wa.sent_interactive_lists) == 2
    assert mock_wa.sent_interactive_lists[1]["button"] == "Select T-Shirt"


@pytest.mark.asyncio
async def test_chat_service_opt_out_and_opt_in(
    test_settings: Settings,
    setup_test_db: None,
) -> None:
    """Test user opt-out and opt-in handling."""
    mock_llm = MockLLMProvider()
    mock_wa = MockWhatsAppService()
    chat_service = ChatService(
        llm_provider=mock_llm,
        whatsapp_service=mock_wa,
        settings=test_settings,
    )

    sender = "5550001111"
    # Opt-out
    await chat_service.handle_incoming_message(sender_id=sender, message_text="STOP")
    assert len(mock_llm.prompts) == 0  # LLM must not be called
    assert len(mock_wa.sent_messages) == 1
    assert "unsubscribed" in mock_wa.sent_messages[0][1]

    # Subsequent message while opted-out is suppressed
    await chat_service.handle_incoming_message(sender_id=sender, message_text="Are you still there?")
    assert len(mock_llm.prompts) == 0  # Still no LLM call
    assert len(mock_wa.sent_messages) == 1  # No new message sent

    # Opt back in
    await chat_service.handle_incoming_message(sender_id=sender, message_text="START")
    assert len(mock_wa.sent_messages) == 2
    assert "opted in" in mock_wa.sent_messages[1][1]

    # Regular message works again
    mock_llm.reply = "Glad you are back!"
    await chat_service.handle_incoming_message(sender_id=sender, message_text="Can I ask a question?")
    assert len(mock_llm.prompts) == 1
    assert mock_wa.sent_messages[2] == (sender, "Glad you are back!")


@pytest.mark.asyncio
async def test_chat_service_human_handoff(
    test_settings: Settings,
    setup_test_db: None,
) -> None:
    """Test human agent handoff request and resume."""
    mock_llm = MockLLMProvider()
    mock_wa = MockWhatsAppService()
    chat_service = ChatService(
        llm_provider=mock_llm,
        whatsapp_service=mock_wa,
        settings=test_settings,
    )

    sender = "7778889999"
    # Request handoff
    await chat_service.handle_incoming_message(sender_id=sender, message_text="I need to talk to a human agent")
    assert len(mock_llm.prompts) == 0  # LLM must not be called
    assert len(mock_wa.sent_messages) == 1
    assert "transferred you to a human agent" in mock_wa.sent_messages[0][1]

    # Messages during handoff are suppressed for AI
    await chat_service.handle_incoming_message(sender_id=sender, message_text="Is anyone there?")
    assert len(mock_llm.prompts) == 0
    assert len(mock_wa.sent_messages) == 1

    # Resume with bot
    await chat_service.handle_incoming_message(sender_id=sender, message_text="bot")
    assert len(mock_wa.sent_messages) == 2
    assert "Human handoff ended" in mock_wa.sent_messages[1][1]

    # Regular AI replies resume
    mock_llm.reply = "How can I help now?"
    await chat_service.handle_incoming_message(sender_id=sender, message_text="What are your opening hours?")
    assert len(mock_llm.prompts) == 1
    assert mock_wa.sent_messages[2] == (sender, "How can I help now?")
