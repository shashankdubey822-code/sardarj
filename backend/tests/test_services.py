"""Unit tests for services: whatsapp message splitting, consent, handoff, and knowledge."""

import pytest
from app.services.consent import check_consent_command, is_user_opted_out, set_user_opt_out
from app.services.handoff import is_handoff_active, is_handoff_requested, set_handoff_active
from app.services.knowledge import retrieve
from app.services.whatsapp import split_message


def test_split_message_short() -> None:
    """Test that message below 4000 characters is not split."""
    text = "Hello, world!"
    chunks = split_message(text, max_length=4000)
    assert chunks == [text]


def test_split_message_exact_boundary() -> None:
    """Test message exactly at boundary."""
    text = "a" * 4000
    chunks = split_message(text, max_length=4000)
    assert len(chunks) == 1
    assert len(chunks[0]) == 4000


def test_split_message_paragraphs() -> None:
    """Test message splitting across paragraphs."""
    p1 = "a" * 2500
    p2 = "b" * 2000
    full_text = f"{p1}\n\n{p2}"
    chunks = split_message(full_text, max_length=4000)
    assert len(chunks) == 2
    assert chunks[0] == p1
    assert chunks[1] == p2


def test_split_message_giant_single_paragraph() -> None:
    """Test a continuous block of text without paragraphs exceeding limit."""
    giant_text = "x" * 9500
    chunks = split_message(giant_text, max_length=4000)
    assert len(chunks) == 3
    assert len(chunks[0]) == 4000
    assert len(chunks[1]) == 4000
    assert len(chunks[2]) == 1500
    assert "".join(chunks) == giant_text


def test_consent_commands() -> None:
    """Test consent keyword detection for opt-in and opt-out."""
    assert check_consent_command("STOP") == (True, "opt_out")
    assert check_consent_command(" unsubscribe ") == (True, "opt_out")
    assert check_consent_command("opt-out") == (True, "opt_out")
    assert check_consent_command("START") == (True, "opt_in")
    assert check_consent_command(" subscribe ") == (True, "opt_in")
    assert check_consent_command("Hello there") == (False, "none")


@pytest.mark.asyncio
async def test_consent_in_memory_toggle() -> None:
    """Test setting and checking user opt-out in memory."""
    user = "+19999990001"
    assert await is_user_opted_out(user) is False
    await set_user_opt_out(user, True)
    assert await is_user_opted_out(user) is True
    await set_user_opt_out(user, False)
    assert await is_user_opted_out(user) is False


def test_handoff_detection() -> None:
    """Test human agent handoff phrase detection."""
    assert is_handoff_requested("I want to speak to a human please") is True
    assert is_handoff_requested("Can I talk to an agent?") is True
    assert is_handoff_requested("Representative please") is True
    assert is_handoff_requested("What are your business hours?") is False


@pytest.mark.asyncio
async def test_handoff_in_memory_toggle() -> None:
    """Test toggling handoff state in memory."""
    user = "+19999990002"
    assert await is_handoff_active(user) is False
    await set_handoff_active(user, True)
    assert await is_handoff_active(user) is True
    await set_handoff_active(user, False)
    assert await is_handoff_active(user) is False


@pytest.mark.asyncio
async def test_knowledge_retrieve_placeholder() -> None:
    """Test knowledge retrieval RAG hook returns empty list placeholder."""
    results = await retrieve("Tell me about warranty policies")
    assert results == []
