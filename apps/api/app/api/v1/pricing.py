import hashlib
import hmac
import json
import math
import re
from collections import Counter
from datetime import timedelta
from decimal import Decimal
from uuid import uuid4

from fastapi import APIRouter, HTTPException
from sqlalchemy import select

from app.db.models import Product, Quote

from .cart import find_cart
from .common import DEMO_COMPANY, DEMO_PINS, VALIDATION, AppSettings, Authorization, Db, iso_time, legacy_time, record
from .contracts import QuoteDto, QuoteResponse

router = APIRouter(tags=["Pricing"])
POLICY = "demo-noida-v1"
DELIVERY_PAISE = 19900
FACTORS = {3: 110, 6: 100, 12: 90}
QUOTE_FIELDS = (
    "id", "cartId", "cartRevision", "ownerId", "city", "pin", "lines", "breakdown",
    "policyVersion", "expiresAt",
)


def canonical(value) -> str:
    if isinstance(value, list):
        return "[" + ",".join(canonical(item) for item in value) + "]"
    if isinstance(value, dict):
        # JavaScript sorts object keys by UTF-16 code units.
        keys = sorted(value, key=lambda key: key.encode("utf-16-be", "surrogatepass"))
        return "{" + ",".join(f"{canonical(key)}:{canonical(value[key])}" for key in keys) + "}"
    if isinstance(value, float):
        if not math.isfinite(value):
            return "null"
        if value == 0:
            return "0"
        if 1e-6 <= abs(value) < 1e21:
            return format(Decimal(repr(value)).normalize(), "f")
        mantissa, exponent = repr(value).split("e")
        return f"{mantissa.removesuffix('.0')}e{int(exponent):+d}"
    scalar = json.dumps(value, ensure_ascii=False, separators=(",", ":"))
    return scalar.encode("utf-8", "backslashreplace").decode("utf-8")


def request_hash(payload: dict) -> str:
    return hashlib.sha256(canonical(payload).encode("utf-8")).hexdigest()


def sign(payload: dict, secret: str) -> str:
    return hmac.new(secret.encode("utf-8"), canonical(payload).encode("utf-8"), hashlib.sha256).hexdigest()


def valid_signature(payload: dict, signature: str, secret: str) -> bool:
    return bool(re.fullmatch(r"[0-9a-f]{64}", signature)) and hmac.compare_digest(
        sign(payload, secret), signature
    )


def quote_payload(data: dict) -> dict:
    return {name: data[name] for name in QUOTE_FIELDS}


async def company_inventory(db: Db) -> dict[str, Product]:
    return {
        product.id: product
        for product in await db.scalars(select(Product).where(Product.company_id == DEMO_COMPANY))
    }


def listing_available(product: Product | None, city: str) -> bool:
    return bool(product and product.active and product.published and city in (product.cities or []))


def validate_demand(lines: list[dict], products: dict[str, Product], city: str) -> Counter[str]:
    demand = Counter()
    for line in lines:
        product = products.get(line["productId"])
        if not listing_available(product, city):
            raise HTTPException(409, "A listing is no longer available in this city")
        if line["mode"] == "buy" and product.purchase_paise <= 0:
            raise HTTPException(409, "This product is available for rental pricing only")
        if not any(option["id"] == line["variantId"] for option in product.variants):
            raise HTTPException(400, "Choose a valid product variant")
        for part in product.components or [{"productId": product.id, "quantity": 1}]:
            component = products.get(part["productId"])
            if component and component.components:
                raise HTTPException(400, "Nested bundles are not supported")
            demand[part["productId"]] += part["quantity"] * line["quantity"]
    for product_id, quantity in demand.items():
        product = products.get(product_id)
        if not listing_available(product, city) or product.stock < quantity:
            raise HTTPException(409, "An item or required bundle component is unavailable")
    return demand


def price_lines(lines: list[dict], products: dict[str, Product], city: str) -> tuple[list[dict], dict]:
    if not lines:
        raise HTTPException(400, "Your cart is empty")
    validate_demand(lines, products, city)
    priced = []
    for line in lines:
        product = products[line["productId"]]
        variant = next(option for option in product.variants if option["id"] == line["variantId"])
        mode, tenure, quantity = line["mode"], line["tenure"], line["quantity"]
        if mode not in {"rent", "buy"} or tenure not in FACTORS or type(quantity) is not int or not 1 <= quantity <= 10:
            raise HTTPException(400, "Invalid item configuration")
        # Integer math matches Math.round at the half-paise boundary.
        unit = (
            product.purchase_paise if mode == "buy"
            else ((product.monthly_paise + variant["monthlyDeltaPaise"]) * FACTORS[tenure] + 50) // 100
        )
        priced.append({
            **line, "name": product.name, "unitPaise": unit, "totalPaise": unit * quantity,
            "depositPaise": product.deposit_paise * quantity if mode == "rent" else 0,
        })
    subtotal = sum(line["totalPaise"] for line in priced)
    deposit = sum(line["depositPaise"] for line in priced)
    gst = ((subtotal + DELIVERY_PAISE) * 18 + 50) // 100
    return priced, {
        "subtotalPaise": subtotal,
        "depositPaise": deposit,
        "deliveryPaise": DELIVERY_PAISE,
        "gstPaise": gst,
        "totalPaise": subtotal + deposit + DELIVERY_PAISE + gst,
        "currency": "INR",
        "taxLabel": "Synthetic demo GST (18%)",
    }


@router.post("/quotes", status_code=201, operation_id="createQuote", response_model=QuoteResponse, responses=VALIDATION)
async def create_quote(body: QuoteDto, db: Db, settings: AppSettings, authorization: Authorization = None):
    async with db.begin():
        cart = await find_cart(db, body.cartId, settings, authorization)
        if body.pin not in DEMO_PINS or cart.city != "noida":
            raise HTTPException(409, "This PIN is outside the demo service zone")
        lines, breakdown = price_lines(cart.lines, await company_inventory(db), cart.city)
        expiry = legacy_time(timedelta(minutes=15))
        quote = Quote(
            id=str(uuid4()), cart_id=cart.id, cart_revision=cart.revision, owner_id=cart.owner_id,
            city=cart.city, pin=body.pin, lines=lines, breakdown=breakdown,
            policy_version=POLICY, expires_at=expiry,
        )
        # The signature excludes database metadata such as createdAt.
        data = {
            "id": quote.id, "cartId": cart.id, "cartRevision": cart.revision, "ownerId": cart.owner_id,
            "city": cart.city, "pin": body.pin, "lines": lines, "breakdown": breakdown,
            "policyVersion": POLICY, "expiresAt": iso_time(expiry),
        }
        quote.signature = sign(data, settings.quote_secret.get_secret_value())
        db.add(quote)
        await db.flush()
        return {**record(quote), "demo": True}
