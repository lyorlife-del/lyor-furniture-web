"""Confirmed preferences and location-aware storefront reads."""
from datetime import UTC, datetime
from hashlib import sha256
from uuid import UUID

from fastapi import APIRouter, HTTPException, Request, Response
from pydantic import BaseModel, Field
from sqlalchemy import select, update
from sqlalchemy.dialects.postgresql import insert

from app.core.security import require_identity
from app.db.serviceability import cities, preferences
from app.db.models import Product
from app.services.serviceability import LocationError, PinCheckResponse, check_pin, current_reference
from .common import AppSettings, Authorization, DEMO_COMPANY, Db
from .contracts import Input, LineDto
from .pricing import validate_demand

router = APIRouter(tags=["Serviceability"])


class PreferenceChange(Input):
    pincode: str
    expectedRevision: int = Field(ge=0)


class Preference(BaseModel):
    revision: int = 0
    confirmedAt: datetime | None = None
    selection: PinCheckResponse | None = None


def subject(request: Request, settings: AppSettings, authorization: Authorization):
    if authorization is not None:
        return "owner:" + require_identity(settings, authorization).id
    guest = request.cookies.get("lyor-location-guest")
    if not guest:
        return None
    try:
        token = UUID(guest)
        if token.version != 4:
            raise ValueError
    except ValueError:
        raise HTTPException(400, "Invalid guest location session") from None
    return "guest:" + sha256(token.bytes).hexdigest()


@router.get("/location-preference", response_model=Preference, operation_id="getLocationPreference")
async def read_preference(request: Request, response: Response, db: Db, settings: AppSettings, authorization: Authorization = None):
    response.headers["Cache-Control"] = "no-store"
    key = subject(request, settings, authorization)
    if key is None:
        return Preference()
    row = (await db.execute(select(preferences).where(
        preferences.c.company_id == settings.serviceability_company_id, preferences.c.subject == key,
    ))).mappings().one_or_none()
    if row is None:
        return Preference()
    return Preference(revision=row["revision"], confirmedAt=row["confirmed_at"],
                      selection=await check_pin(db, row["pincode"], settings, audit_manual=False))


@router.put("/location-preference", response_model=Preference, operation_id="saveLocationPreference")
async def save_preference(body: PreferenceChange, request: Request, response: Response, db: Db, settings: AppSettings,
                          authorization: Authorization = None):
    response.headers["Cache-Control"] = "no-store"
    key = subject(request, settings, authorization)
    if key is None:
        raise HTTPException(400, "A guest location session is required")
    async with db.begin():
        result = await check_pin(db, body.pincode, settings, audit_manual=False)
        if not result.deliverable:
            raise LocationError(result.reasonCode, result.message, 409)
        now = datetime.now(UTC)
        values = dict(pincode=result.pincode, revision=body.expectedRevision + 1, confirmed_at=now)
        company = settings.serviceability_company_id
        if body.expectedRevision == 0:
            statement = insert(preferences).values(company_id=company, subject=key, **values).on_conflict_do_nothing()
        else:
            statement = update(preferences).where(
                preferences.c.company_id == company, preferences.c.subject == key,
                preferences.c.revision == body.expectedRevision,
            ).values(**values)
        if await db.scalar(statement.returning(preferences.c.revision)) is None:
            raise LocationError("preference_changed", "Your saved location changed. Check the PIN and confirm again.", 409)
    return Preference(revision=values["revision"], confirmedAt=now, selection=result)


class City(BaseModel):
    id: str
    name: str


@router.get("/serviceability/cities", response_model=list[City], operation_id="listDeliveryCities")
async def delivery_cities(response: Response, db: Db, settings: AppSettings):
    response.headers["Cache-Control"] = "no-store"
    await current_reference(db, settings)
    return (await db.execute(select(cities.c.slug.label("id"), cities.c.name).where(
        cities.c.company_id == settings.serviceability_company_id, cities.c.active.is_(True),
    ).order_by(cities.c.slug))).mappings().all()


async def catalogue_city(db: Db, pin: str, settings: AppSettings):
    selection = await check_pin(db, pin, settings, audit_manual=False)
    if not selection.demo or settings.serviceability_company_id != DEMO_COMPANY:
        raise LocationError("inventory_unverified", "Inventory for this area is awaiting verification.")
    return selection.zone.cityId if selection.deliverable and selection.zone else None


class AvailabilityRequest(Input):
    pincode: str
    lines: list[LineDto] = Field(min_length=1, max_length=25)


class CartAvailability(BaseModel):
    unavailable: list[str]
    message: str | None


@router.post("/serviceability/cart-availability", response_model=CartAvailability, operation_id="previewCartAvailability")
async def cart_availability(body: AvailabilityRequest, response: Response, db: Db, settings: AppSettings):
    response.headers["Cache-Control"] = "no-store"
    city = await catalogue_city(db, body.pincode, settings)
    lines = [line.model_dump() for line in body.lines]
    products = (await db.scalars(select(Product).where(
        Product.company_id == DEMO_COMPANY, Product.id.in_({line["productId"] for line in lines}),
    ))).all()
    inventory = {product.id: product for product in products}
    missing = {part["productId"] for product in products for part in product.components} - inventory.keys()
    if missing:
        inventory.update({product.id: product for product in await db.scalars(select(Product).where(
            Product.company_id == DEMO_COMPANY, Product.id.in_(missing),
        ))})
    unavailable = []
    for line in lines:
        try:
            validate_demand([line], inventory, city)
        except HTTPException:
            unavailable.append(line["productId"])
    try:
        validate_demand(lines, inventory, city)
    except HTTPException as exc:
        return CartAvailability(unavailable=unavailable, message=exc.detail)
    return CartAvailability(unavailable=[], message=None)
