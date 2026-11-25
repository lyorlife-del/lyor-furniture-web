from datetime import UTC, datetime
from typing import Any
from uuid import uuid4

from sqlalchemy import Boolean, ForeignKey, Index, Integer, MetaData, Text, text
from sqlalchemy.dialects.postgresql import ARRAY, JSONB, TIMESTAMP
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    metadata = MetaData(naming_convention={"pk": "%(table_name)s_pkey"})


def utc_now() -> datetime:
    return datetime.now(UTC).replace(tzinfo=None)


class GeneratedId:
    id: Mapped[str] = mapped_column(Text, primary_key=True, default=lambda: str(uuid4()))


class CreatedAt:
    created_at: Mapped[datetime] = mapped_column(
        "createdAt", TIMESTAMP(precision=3), server_default=text("CURRENT_TIMESTAMP")
    )


class UpdatedAt:
    updated_at: Mapped[datetime] = mapped_column(
        "updatedAt", TIMESTAMP(precision=3), default=utc_now, onupdate=utc_now
    )


class Product(CreatedAt, Base):
    __tablename__ = "Product"
    __table_args__ = (
        Index("Product_sku_key", "sku", unique=True),
        Index("Product_slug_key", "slug", unique=True),
    )

    id: Mapped[str] = mapped_column(Text, primary_key=True)
    sku: Mapped[str] = mapped_column(Text)
    slug: Mapped[str] = mapped_column(Text)
    name: Mapped[str] = mapped_column(Text)
    category: Mapped[str] = mapped_column(Text)
    description: Mapped[str] = mapped_column(Text)
    image: Mapped[str] = mapped_column(Text)
    images: Mapped[list[str]] = mapped_column(JSONB)
    material: Mapped[str] = mapped_column(Text)
    dimensions: Mapped[str] = mapped_column(Text)
    color: Mapped[str] = mapped_column(Text)
    monthly_paise: Mapped[int] = mapped_column("monthlyPaise", Integer)
    purchase_paise: Mapped[int] = mapped_column("purchasePaise", Integer)
    deposit_paise: Mapped[int] = mapped_column("depositPaise", Integer, server_default=text("0"))
    stock: Mapped[int] = mapped_column(Integer)
    active: Mapped[bool] = mapped_column(Boolean, server_default=text("true"))
    published: Mapped[bool] = mapped_column(Boolean, server_default=text("true"))
    company_id: Mapped[str] = mapped_column("companyId", Text, server_default="lyor-demo")
    cities: Mapped[list[str] | None] = mapped_column(ARRAY(Text))
    variants: Mapped[list[dict[str, Any]]] = mapped_column(JSONB)
    components: Mapped[list[dict[str, Any]]] = mapped_column(JSONB)
    featured: Mapped[bool] = mapped_column(Boolean, server_default=text("false"))
    reservations: Mapped[list["Reservation"]] = relationship(
        back_populates="product", passive_deletes="all"
    )


class Cart(GeneratedId, CreatedAt, UpdatedAt, Base):
    __tablename__ = "Cart"

    owner_id: Mapped[str | None] = mapped_column("ownerId", Text)
    city: Mapped[str] = mapped_column(Text, server_default="noida")
    lines: Mapped[list[dict[str, Any]]] = mapped_column(JSONB, server_default=text("'[]'::jsonb"))
    revision: Mapped[int] = mapped_column(Integer, server_default=text("0"))
    quotes: Mapped[list["Quote"]] = relationship(back_populates="cart", passive_deletes="all")


class Quote(GeneratedId, CreatedAt, Base):
    __tablename__ = "Quote"

    cart_id: Mapped[str] = mapped_column(
        "cartId", ForeignKey("Cart.id", name="Quote_cartId_fkey", ondelete="RESTRICT", onupdate="CASCADE")
    )
    cart_revision: Mapped[int] = mapped_column("cartRevision", Integer)
    owner_id: Mapped[str | None] = mapped_column("ownerId", Text)
    city: Mapped[str] = mapped_column(Text)
    pin: Mapped[str] = mapped_column(Text)
    lines: Mapped[list[dict[str, Any]]] = mapped_column(JSONB)
    breakdown: Mapped[dict[str, Any]] = mapped_column(JSONB)
    policy_version: Mapped[str] = mapped_column("policyVersion", Text)
    signature: Mapped[str] = mapped_column(Text)
    expires_at: Mapped[datetime] = mapped_column("expiresAt", TIMESTAMP(precision=3))
    cart: Mapped[Cart] = relationship(back_populates="quotes")
    order: Mapped["OrderIntent | None"] = relationship(
        back_populates="quote", passive_deletes="all"
    )


class OrderIntent(GeneratedId, CreatedAt, UpdatedAt, Base):
    __tablename__ = "OrderIntent"
    __table_args__ = (
        Index("OrderIntent_quoteId_key", "quoteId", unique=True),
        Index("OrderIntent_externalId_key", "externalId", unique=True),
        Index("OrderIntent_ownerId_idempotencyKey_key", "ownerId", "idempotencyKey", unique=True),
    )

    owner_id: Mapped[str] = mapped_column("ownerId", Text)
    company_id: Mapped[str] = mapped_column("companyId", Text, server_default="lyor-demo")
    idempotency_key: Mapped[str] = mapped_column("idempotencyKey", Text)
    request_hash: Mapped[str] = mapped_column("requestHash", Text)
    quote_id: Mapped[str] = mapped_column(
        "quoteId", ForeignKey("Quote.id", name="OrderIntent_quoteId_fkey", ondelete="RESTRICT", onupdate="CASCADE")
    )
    city: Mapped[str] = mapped_column(Text)
    address: Mapped[dict[str, Any]] = mapped_column(JSONB)
    lines: Mapped[list[dict[str, Any]]] = mapped_column(JSONB)
    breakdown: Mapped[dict[str, Any]] = mapped_column(JSONB)
    order_state: Mapped[str] = mapped_column("orderState", Text, server_default="pending")
    payment_state: Mapped[str] = mapped_column("paymentState", Text, server_default="not_collected")
    stock_state: Mapped[str] = mapped_column("stockState", Text, server_default="unreserved")
    delivery_state: Mapped[str] = mapped_column("deliveryState", Text, server_default="not_scheduled")
    external_id: Mapped[str | None] = mapped_column("externalId", Text)
    failure_reason: Mapped[str | None] = mapped_column("failureReason", Text)
    attempts: Mapped[int] = mapped_column(Integer, server_default=text("0"))
    quote: Mapped[Quote] = relationship(back_populates="order")
    outbox: Mapped["OutboxEvent | None"] = relationship(back_populates="order", passive_deletes="all")
    reservations: Mapped[list["Reservation"]] = relationship(
        back_populates="order", passive_deletes="all"
    )


class OutboxEvent(GeneratedId, CreatedAt, Base):
    __tablename__ = "OutboxEvent"
    __table_args__ = (Index("OutboxEvent_orderId_key", "orderId", unique=True),)

    order_id: Mapped[str] = mapped_column(
        "orderId", ForeignKey("OrderIntent.id", name="OutboxEvent_orderId_fkey", ondelete="RESTRICT", onupdate="CASCADE")
    )
    status: Mapped[str] = mapped_column(Text, server_default="pending")
    lease_until: Mapped[datetime | None] = mapped_column("leaseUntil", TIMESTAMP(precision=3))
    available_at: Mapped[datetime] = mapped_column(
        "availableAt", TIMESTAMP(precision=3), server_default=text("CURRENT_TIMESTAMP")
    )
    attempts: Mapped[int] = mapped_column(Integer, server_default=text("0"))
    last_error: Mapped[str | None] = mapped_column("lastError", Text)
    order: Mapped[OrderIntent] = relationship(back_populates="outbox")


class Reservation(GeneratedId, Base):
    __tablename__ = "Reservation"
    __table_args__ = (Index("Reservation_orderId_productId_key", "orderId", "productId", unique=True),)

    order_id: Mapped[str] = mapped_column(
        "orderId", ForeignKey("OrderIntent.id", name="Reservation_orderId_fkey", ondelete="RESTRICT", onupdate="CASCADE")
    )
    product_id: Mapped[str] = mapped_column(
        "productId", ForeignKey("Product.id", name="Reservation_productId_fkey", ondelete="RESTRICT", onupdate="CASCADE")
    )
    quantity: Mapped[int] = mapped_column(Integer)
    order: Mapped[OrderIntent] = relationship(back_populates="reservations")
    product: Mapped[Product] = relationship(back_populates="reservations")


class BusinessEnquiry(GeneratedId, CreatedAt, Base):
    __tablename__ = "BusinessEnquiry"
    __table_args__ = (Index("BusinessEnquiry_idempotencyKey_key", "idempotencyKey", unique=True),)

    idempotency_key: Mapped[str] = mapped_column("idempotencyKey", Text)
    request_hash: Mapped[str] = mapped_column("requestHash", Text)
    contact: Mapped[dict[str, Any]] = mapped_column(JSONB)
    sites: Mapped[list[dict[str, Any]]] = mapped_column(JSONB)
    mode: Mapped[str] = mapped_column(Text)
    status: Mapped[str] = mapped_column(Text, server_default="received")


class AuditLog(GeneratedId, CreatedAt, Base):
    __tablename__ = "AuditLog"

    actor_id: Mapped[str] = mapped_column("actorId", Text)
    action: Mapped[str] = mapped_column(Text)
    entity_id: Mapped[str] = mapped_column("entityId", Text)
    detail: Mapped[dict[str, Any]] = mapped_column(JSONB)
