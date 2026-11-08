"""SQLAlchemy 2.0 async engine and session factory."""

import re
from typing import AsyncGenerator, Optional
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from app.config import get_settings
from app.db.models import Base


def normalize_database_url(url: str) -> str:
    """Ensure database URL has appropriate async dialect.

    Args:
        url: Raw database connection URL string.

    Returns:
        str: Dialect-adjusted URL for async engines.
    """
    if url.startswith("postgres://"):
        return url.replace("postgres://", "postgresql+asyncpg://", 1)
    if url.startswith("postgresql://") and not url.startswith("postgresql+asyncpg://"):
        return url.replace("postgresql://", "postgresql+asyncpg://", 1)
    if url.startswith("sqlite://") and not url.startswith("sqlite+aiosqlite://"):
        return url.replace("sqlite://", "sqlite+aiosqlite://", 1)
    return url


_engine: Optional[AsyncEngine] = None
_session_factory: Optional[async_sessionmaker[AsyncSession]] = None


def get_engine(database_url: Optional[str] = None) -> AsyncEngine:
    """Retrieve or initialize singleton AsyncEngine instance.

    Args:
        database_url: Optional database URL override.

    Returns:
        AsyncEngine: Configured SQLAlchemy asynchronous engine.
    """
    global _engine, _session_factory
    settings = get_settings()
    raw_url = database_url or settings.async_database_url
    url = normalize_database_url(raw_url)

    if _engine is None or str(_engine.url) != url:
        _engine = create_async_engine(
            url,
            echo=False,
            future=True,
        )
        _session_factory = async_sessionmaker(
            bind=_engine,
            class_=AsyncSession,
            expire_on_commit=False,
            autocommit=False,
            autoflush=False,
        )
    return _engine


def get_session_factory(database_url: Optional[str] = None) -> async_sessionmaker[AsyncSession]:
    """Retrieve the async sessionmaker factory.

    Args:
        database_url: Optional database URL override.

    Returns:
        async_sessionmaker[AsyncSession]: Configured session factory.
    """
    get_engine(database_url)
    assert _session_factory is not None
    return _session_factory


async def init_db(database_url: Optional[str] = None) -> None:
    """Create database tables asynchronously and seed initial catalog.

    Args:
        database_url: Optional database URL override.
    """
    from app.db.catalog_data import seed_catalog_if_empty

    target_engine = get_engine(database_url)
    async with target_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    factory = get_session_factory(database_url)
    async with factory() as session:
        await seed_catalog_if_empty(session)


async def get_db_session() -> AsyncGenerator[AsyncSession, None]:
    """Provide transactional database session scope for dependency injection.

    Yields:
        AsyncSession: Active database session.
    """
    factory = get_session_factory()
    async with factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


# Module-level convenience aliases
engine = get_engine()
async_session_factory = get_session_factory()
