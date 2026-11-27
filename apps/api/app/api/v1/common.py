from datetime import UTC, datetime, timedelta
from typing import Annotated

from fastapi import Depends, Header, Request
from sqlalchemy import inspect
from sqlalchemy.exc import DBAPIError, SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings
from app.core.errors import ErrorResponse
from app.core.security import Identity, get_settings, require_admin, require_identity, require_staff
from app.db.models import Product, utc_now

DEMO_COMPANY = "lyor-demo"
DEMO_PINS = {"201301", "201302", "201303", "201304", "201305", "201306", "201307", "201309", "201310"}
VALIDATION = {400: {"model": ErrorResponse}}


async def get_db(request: Request):
    async with request.app.state.sessions() as session:
        try:
            yield session
        except SQLAlchemyError:
            path = request.url.path
            if (path == "/api/v1/location-preference" or path.startswith("/api/v1/serviceability/") or
                ("deliveryPin" in request.query_params and (path == "/api/v1/catalog" or path.startswith("/api/v1/products/")))):
                from app.services.serviceability import LocationError
                raise LocationError("location_unavailable", "Location checks are temporarily unavailable. Please try again.") from None
            raise


Db = Annotated[AsyncSession, Depends(get_db)]
AppSettings = Annotated[Settings, Depends(get_settings)]
Owner = Annotated[Identity, Depends(require_identity)]
Staff = Annotated[Identity, Depends(require_staff)]
Admin = Annotated[Identity, Depends(require_admin)]
Authorization = Annotated[str | None, Header()]
IdempotencyKey = Annotated[str | None, Header(alias="Idempotency-Key")]


def iso_time(value: datetime) -> str:
    if value.tzinfo is not None:
        value = value.astimezone(UTC).replace(tzinfo=None)
    return value.isoformat(timespec="milliseconds") + "Z"


def legacy_time(offset: timedelta = timedelta()) -> datetime:
    now = utc_now() + offset
    return now.replace(microsecond=now.microsecond // 1000 * 1000)


def record(model) -> dict:
    output = {}
    for attr in inspect(type(model)).column_attrs:
        value = getattr(model, attr.key)
        output[attr.columns[0].name] = iso_time(value) if isinstance(value, datetime) else value
    if isinstance(model, Product) and output["cities"] is None:
        output["cities"] = []
    return output


def public_listing(city: str | None = None):
    conditions = [Product.active.is_(True), Product.published.is_(True), Product.company_id == DEMO_COMPANY]
    if city is not None:
        conditions.append(Product.cities.contains([city]))
    return conditions


def sqlstate(error: DBAPIError) -> str | None:
    return getattr(error.orig, "sqlstate", None)
