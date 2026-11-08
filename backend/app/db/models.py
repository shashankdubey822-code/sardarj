"""SQLAlchemy 2.0 asynchronous database models."""

from datetime import datetime
from typing import Optional
from sqlalchemy import DateTime, Integer, String, Text, func
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    """Base declarative class for all database models."""
    pass


class MessageRecord(Base):
    """Model tracking incoming and outgoing WhatsApp messages."""

    __tablename__ = "messages"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    sender_id: Mapped[str] = mapped_column(String(64), index=True, nullable=False)
    role: Mapped[str] = mapped_column(String(16), nullable=False)  # 'user' or 'assistant'
    content: Mapped[str] = mapped_column(Text, nullable=False)
    message_id: Mapped[Optional[str]] = mapped_column(String(128), index=True, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )


class UserState(Base):
    """Model tracking user consent (opt-in/opt-out) and human handoff state."""

    __tablename__ = "user_states"

    sender_id: Mapped[str] = mapped_column(String(64), primary_key=True)
    is_opted_out: Mapped[bool] = mapped_column(default=False, nullable=False)
    is_handed_off: Mapped[bool] = mapped_column(default=False, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )


class Product(Base):
    """Catalog product model for retail shopping."""

    __tablename__ = "products"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    item_code: Mapped[Optional[str]] = mapped_column(String(64), index=True, nullable=True)
    name: Mapped[str] = mapped_column(String(128), index=True, nullable=False)
    category: Mapped[str] = mapped_column(String(64), index=True, nullable=False)
    color: Mapped[str] = mapped_column(String(32), default="Standard", nullable=False)
    available_sizes: Mapped[str] = mapped_column(String(64), nullable=False)
    base_price: Mapped[float] = mapped_column(nullable=False)
    tax_percentage: Mapped[float] = mapped_column(default=5.0, nullable=False)
    final_price: Mapped[float] = mapped_column(nullable=False)
    stock_quantity: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    image_url: Mapped[Optional[str]] = mapped_column(String(256), nullable=True)
    is_in_stock: Mapped[bool] = mapped_column(default=True, nullable=False)


class CartItem(Base):
    """Session cart item for retail customers."""

    __tablename__ = "cart_items"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    sender_id: Mapped[str] = mapped_column(String(64), index=True, nullable=False)
    product_name: Mapped[str] = mapped_column(String(128), nullable=False)
    size: Mapped[str] = mapped_column(String(32), nullable=False)
    color: Mapped[str] = mapped_column(String(32), nullable=False)
    quantity: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    price: Mapped[float] = mapped_column(nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )


class B2BInquiry(Base):
    """Intake form inquiries for bulk buyers and custom apparel manufacturing."""

    __tablename__ = "b2b_inquiries"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    sender_id: Mapped[str] = mapped_column(String(64), index=True, nullable=False)
    company_name: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    requirement: Mapped[str] = mapped_column(Text, nullable=False)
    estimated_quantity: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    status: Mapped[str] = mapped_column(String(32), default="pending", nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

