"""Unit tests for SQLAlchemy models, database session, and URL normalization."""

import pytest
from sqlalchemy import select
from app.db.models import MessageRecord, UserState
from app.db.session import get_engine, get_session_factory, init_db, normalize_database_url


def test_normalize_database_url_postgres() -> None:
    """Test postgres dialect normalization to postgresql+asyncpg."""
    assert normalize_database_url("postgres://u:p@localhost:5432/db") == "postgresql+asyncpg://u:p@localhost:5432/db"
    assert normalize_database_url("postgresql://u:p@localhost:5432/db") == "postgresql+asyncpg://u:p@localhost:5432/db"
    assert (
        normalize_database_url("postgresql+asyncpg://u:p@localhost:5432/db")
        == "postgresql+asyncpg://u:p@localhost:5432/db"
    )


def test_normalize_database_url_sqlite() -> None:
    """Test sqlite dialect normalization to sqlite+aiosqlite."""
    assert normalize_database_url("sqlite:///./test.db") == "sqlite+aiosqlite:///./test.db"
    assert normalize_database_url("sqlite+aiosqlite:///./test.db") == "sqlite+aiosqlite:///./test.db"


@pytest.mark.asyncio
async def test_init_db_and_session_crud() -> None:
    """Test initializing tables in memory and performing CRUD operations."""
    mem_url = "sqlite+aiosqlite:///:memory:"
    await init_db(mem_url)

    factory = get_session_factory(mem_url)
    async with factory() as session:
        # Create user state
        user_state = UserState(sender_id="919876543210", is_opted_out=False, is_handed_off=True)
        session.add(user_state)

        # Create message record
        msg = MessageRecord(
            sender_id="919876543210",
            role="user",
            content="Hello world",
            message_id="wamid_test_123",
        )
        session.add(msg)
        await session.commit()

    async with factory() as session:
        # Verify user state
        u_res = await session.execute(select(UserState).where(UserState.sender_id == "919876543210"))
        u = u_res.scalars().first()
        assert u is not None
        assert u.is_handed_off is True
        assert u.is_opted_out is False

        # Verify message record
        m_res = await session.execute(select(MessageRecord).where(MessageRecord.sender_id == "919876543210"))
        m = m_res.scalars().first()
        assert m is not None
        assert m.role == "user"
        assert m.content == "Hello world"
        assert m.message_id == "wamid_test_123"
