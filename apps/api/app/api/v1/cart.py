import re

from fastapi import APIRouter, HTTPException
from sqlalchemy import select
from sqlalchemy.exc import DBAPIError

from app.core.security import require_identity
from app.db.models import Cart, Product

from .common import VALIDATION, AppSettings, Authorization, Db, legacy_time, public_listing, record, sqlstate
from .contracts import CartDto, CartResponse, SavedCartResponse

router = APIRouter(prefix="/cart", tags=["Cart"])
CART_REFERENCE = re.compile(r"[0-9a-f-]{36}", re.IGNORECASE | re.ASCII)
CART_CONFLICT = "Cart changed in another tab. Refresh and try again."


async def find_cart(db: Db, cart_id: str, settings: AppSettings, token: str | None) -> Cart:
    if not CART_REFERENCE.fullmatch(cart_id):
        raise HTTPException(400, "Invalid cart reference")
    cart = await db.get(Cart, cart_id)
    if cart is None or (cart.owner_id and (not token or cart.owner_id != require_identity(settings, token).id)):
        raise HTTPException(404, "Cart not found")
    return cart


async def with_products(db: Db, cart: Cart) -> dict:
    ids = {line["productId"] for line in cart.lines} if isinstance(cart.lines, list) else set()
    summaries = []
    if ids:
        result = await db.execute(
            select(
                Product.id, Product.slug, Product.name, Product.image,
                Product.monthly_paise.label("monthlyPaise"),
                Product.purchase_paise.label("purchasePaise"),
            ).where(Product.id.in_(ids), *public_listing(cart.city))
        )
        summaries = [dict(row) for row in result.mappings()]
    return {**record(cart), "products": summaries}


@router.get("/{id}", operation_id="getCart", response_model=CartResponse)
async def get_cart(id: str, db: Db, settings: AppSettings, authorization: Authorization = None):
    cart = await find_cart(db, id, settings, authorization)
    return await with_products(db, cart)


@router.put("", operation_id="saveCart", response_model=SavedCartResponse, responses=VALIDATION)
async def save_cart(body: CartDto, db: Db, settings: AppSettings, authorization: Authorization = None):
    owner = require_identity(settings, authorization).id if authorization else None
    lines = [line.model_dump() for line in body.lines]
    if len({(line.productId, line.mode) for line in body.lines}) != len(lines):
        raise HTTPException(400, "Merge duplicate cart lines")
    try:
        async with db.begin():
            cart = await db.get(Cart, body.cartId, with_for_update=True)
            if cart is None:
                if body.revision != 0:
                    raise HTTPException(409, "Refresh this cart before saving")
                cart = Cart(id=body.cartId, owner_id=owner, revision=0)
                db.add(cart)
            else:
                if cart.owner_id and cart.owner_id != owner:
                    raise HTTPException(404, "Cart not found")
                if cart.revision != body.revision:
                    raise HTTPException(409, CART_CONFLICT)
            cart.city = body.city
            cart.owner_id = cart.owner_id or owner
            cart.lines = lines
            cart.revision += 1
            cart.updated_at = legacy_time()
            await db.flush()
            return {**await with_products(db, cart), "demo": True}
    except DBAPIError as error:
        if sqlstate(error) in {"23505", "40001"}:
            raise HTTPException(409, CART_CONFLICT) from None
        raise
