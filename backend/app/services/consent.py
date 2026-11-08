"""User consent and opt-in/opt-out management service."""

from typing import Optional, Set, Tuple
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import UserState
from app.db.session import get_session_factory

# In-memory set for rapid lookups and fallback
_OPTED_OUT_USERS: Set[str] = set()


def check_consent_command(message: str) -> Tuple[bool, str]:
    """Check if the incoming message is an opt-in or opt-out command.

    Args:
        message: Raw message string from the user.

    Returns:
        Tuple[bool, str]: (is_consent_command, action_type where action_type is 'opt_in', 'opt_out', or 'none')
    """
    cleaned = message.strip().lower()
    if cleaned in {"stop", "unsubscribe", "optout", "opt-out", "cancel"}:
        return True, "opt_out"
    if cleaned in {"start", "subscribe", "optin", "opt-in", "unstop"}:
        return True, "opt_in"
    return False, "none"


async def set_user_opt_out(
    sender_id: str,
    opted_out: bool,
    session: Optional[AsyncSession] = None,
) -> None:
    """Set opt-out state for a user in memory and database.

    Args:
        sender_id: The WhatsApp sender ID / phone number.
        opted_out: True if user opted out, False if opted in.
        session: Optional active database session.
    """
    if opted_out:
        _OPTED_OUT_USERS.add(sender_id)
    else:
        _OPTED_OUT_USERS.discard(sender_id)

    async def _persist(s: AsyncSession) -> None:
        result = await s.execute(select(UserState).where(UserState.sender_id == sender_id))
        user_state = result.scalars().first()
        if user_state:
            user_state.is_opted_out = opted_out
        else:
            s.add(UserState(sender_id=sender_id, is_opted_out=opted_out, is_handed_off=False))
        await s.commit()

    try:
        if session is not None:
            await _persist(session)
        else:
            factory = get_session_factory()
            async with factory() as s:
                await _persist(s)
    except Exception:
        # Graceful fallback to memory state if DB is unreachable
        pass


async def is_user_opted_out(
    sender_id: str,
    session: Optional[AsyncSession] = None,
) -> bool:
    """Check if a user has opted out of messages.

    Args:
        sender_id: The WhatsApp sender ID / phone number.
        session: Optional active database session.

    Returns:
        bool: True if opted out, False otherwise.
    """
    if sender_id in _OPTED_OUT_USERS:
        return True

    async def _query(s: AsyncSession) -> Optional[bool]:
        result = await s.execute(select(UserState).where(UserState.sender_id == sender_id))
        user_state = result.scalars().first()
        if user_state:
            if user_state.is_opted_out:
                _OPTED_OUT_USERS.add(sender_id)
            return user_state.is_opted_out
        return False

    try:
        if session is not None:
            res = await _query(session)
            return bool(res)
        else:
            factory = get_session_factory()
            async with factory() as s:
                res = await _query(s)
                return bool(res)
    except Exception:
        return sender_id in _OPTED_OUT_USERS
