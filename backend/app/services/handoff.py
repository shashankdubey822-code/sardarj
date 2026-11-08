"""Human agent handoff service."""

from typing import Optional, Set
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import UserState
from app.db.session import get_session_factory

_HANDOFF_USERS: Set[str] = set()


def is_handoff_requested(message: str) -> bool:
    """Determine whether a user message signals human handoff request.

    Args:
        message: Incoming text message.

    Returns:
        bool: True if user expresses need to speak with human agent.
    """
    trigger_phrases = {
        "human",
        "agent",
        "representative",
        "talk to person",
        "support agent",
        "customer care",
        "person",
        "operator",
    }
    lowered = message.strip().lower()
    return any(phrase in lowered for phrase in trigger_phrases)


async def set_handoff_active(
    user_id: str,
    active: bool = True,
    session: Optional[AsyncSession] = None,
) -> None:
    """Set or unset the active handoff state for a user.

    Args:
        user_id: User identifier (phone number).
        active: Whether handoff is enabled.
        session: Optional active database session.
    """
    if active:
        _HANDOFF_USERS.add(user_id)
    else:
        _HANDOFF_USERS.discard(user_id)

    async def _persist(s: AsyncSession) -> None:
        result = await s.execute(select(UserState).where(UserState.sender_id == user_id))
        user_state = result.scalars().first()
        if user_state:
            user_state.is_handed_off = active
        else:
            s.add(UserState(sender_id=user_id, is_opted_out=False, is_handed_off=active))
        await s.commit()

    try:
        if session is not None:
            await _persist(session)
        else:
            factory = get_session_factory()
            async with factory() as s:
                await _persist(s)
    except Exception:
        pass


async def is_handoff_active(
    user_id: str,
    session: Optional[AsyncSession] = None,
) -> bool:
    """Check if handoff is currently active for a user.

    Args:
        user_id: User identifier.
        session: Optional active database session.

    Returns:
        bool: True if user is currently handed off to a human agent.
    """
    if user_id in _HANDOFF_USERS:
        return True

    async def _query(s: AsyncSession) -> Optional[bool]:
        result = await s.execute(select(UserState).where(UserState.sender_id == user_id))
        user_state = result.scalars().first()
        if user_state:
            if user_state.is_handed_off:
                _HANDOFF_USERS.add(user_id)
            return user_state.is_handed_off
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
        return user_id in _HANDOFF_USERS
