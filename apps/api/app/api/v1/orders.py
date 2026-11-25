from fastapi import APIRouter, HTTPException
from sqlalchemy import select
from sqlalchemy.exc import DBAPIError

from app.db.models import AuditLog, Cart, OrderIntent, OutboxEvent, Quote

from .cart import CART_REFERENCE
from .common import DEMO_COMPANY, VALIDATION, AppSettings, Db, IdempotencyKey, Owner, legacy_time, record, sqlstate
from .contracts import CheckoutDto, OrderRecord, OrderResponse
from .pricing import company_inventory, price_lines, quote_payload, request_hash, valid_signature

router = APIRouter(tags=["Orders"])


async def order_by_key(db: Db, owner: str, key: str):
    return await db.scalar(
        select(OrderIntent).where(OrderIntent.owner_id == owner, OrderIntent.idempotency_key == key)
    )


async def check_quote(body: CheckoutDto, db: Db, owner: str, settings: AppSettings) -> Quote:
    quote = await db.get(Quote, body.quoteId)
    if quote is None or quote.owner_id != owner:
        raise HTTPException(404, "Quote not found")
    if quote.expires_at <= legacy_time():
        raise HTTPException(409, "Quote expired. Refresh the quote and accept the new total.")
    if quote.signature != body.signature or not valid_signature(
        quote_payload(record(quote)), body.signature, settings.quote_secret.get_secret_value()
    ):
        raise HTTPException(409, "Quote could not be verified")
    if body.address.pin != quote.pin:
        raise HTTPException(409, "Address PIN changed. Request a new quote.")
    cart = await db.get(Cart, quote.cart_id)
    if cart is None or cart.owner_id != owner or cart.revision != quote.cart_revision:
        raise HTTPException(409, "Cart changed. Refresh your quote.")
    _, breakdown = price_lines(quote.lines, await company_inventory(db), quote.city)
    if request_hash(breakdown) != request_hash(quote.breakdown):
        raise HTTPException(409, "Pricing changed. Refresh your quote.")
    return quote


@router.post("/orders", status_code=201, operation_id="createOrder", response_model=OrderResponse, responses=VALIDATION)
async def create_order(body: CheckoutDto, db: Db, owner: Owner, settings: AppSettings, idempotency_key: IdempotencyKey = None):
    if not CART_REFERENCE.fullmatch(idempotency_key or ""):
        raise HTTPException(400, "A UUID Idempotency-Key is required")
    if not body.consent:
        raise HTTPException(400, "Accept the demo terms to continue")
    digest = request_hash(body.model_dump())
    try:
        async with db.begin():
            await db.connection(execution_options={"isolation_level": "SERIALIZABLE"})
            prior = await order_by_key(db, owner.id, idempotency_key)
            if prior:
                if prior.request_hash != digest:
                    raise HTTPException(409, "This submission key was used for a different request")
                return {**record(prior), "demo": True}
            quote = await check_quote(body, db, owner.id, settings)
            order = OrderIntent(
                owner_id=owner.id, idempotency_key=idempotency_key, request_hash=digest,
                quote_id=quote.id, city=quote.city, address=body.address.model_dump(),
                lines=quote.lines, breakdown=quote.breakdown,
            )
            db.add(order)
            await db.flush()
            db.add_all([
                OutboxEvent(order_id=order.id),
                AuditLog(actor_id=owner.id, action="order.requested", entity_id=order.id, detail={"demo": True}),
            ])
            return {**record(order), "demo": True}
    except DBAPIError as error:
        if sqlstate(error) not in {"23505", "40001", "40P01"}:
            raise
        prior = await order_by_key(db, owner.id, idempotency_key)
        if prior and prior.request_hash == digest:
            return {**record(prior), "demo": True}
        raise HTTPException(409, "Order or cart changed. Refresh before trying again.") from None


@router.get("/me/orders", operation_id="listMyOrders", response_model=list[OrderRecord])
async def my_orders(db: Db, owner: Owner):
    orders = await db.scalars(select(OrderIntent).where(
        OrderIntent.owner_id == owner.id, OrderIntent.company_id == DEMO_COMPANY,
    ).order_by(OrderIntent.created_at.desc()))
    return [record(order) for order in orders]


@router.get("/me/orders/{id}", operation_id="getMyOrder", response_model=OrderResponse)
async def my_order(id: str, db: Db, owner: Owner):
    order = await db.scalar(select(OrderIntent).where(
        OrderIntent.id == id, OrderIntent.owner_id == owner.id, OrderIntent.company_id == DEMO_COMPANY,
    ))
    if order is None:
        raise HTTPException(404, "Order not found")
    return {**record(order), "demo": True}
