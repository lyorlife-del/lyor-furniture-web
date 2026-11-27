"""Postal validity and operational eligibility, independent of stock and slots."""

import re
from datetime import UTC, datetime
from typing import Literal
from uuid import uuid4

from pydantic import BaseModel
from sqlalchemy import insert, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings
from app.db.serviceability import audit, cities, configuration, memberships, postal_codes, references, zones


class LocationError(Exception):
    def __init__(self, code: str, message: str, status: int = 503):
        self.code, self.message, self.status = code, message, status


class PinGeography(BaseModel):
    country: Literal["IN"] = "IN"
    city: str | None
    district: str | None
    state: str
    sourceVersion: str


class DeliveryZone(BaseModel):
    id: str
    name: str
    cityId: str
    city: str


Reason = Literal[
    "serviceable", "unknown_pin", "outside_coverage", "zone_disabled", "zone_paused",
    "mapping_inactive", "mapping_not_effective", "ambiguous_zone",
]


class PinCheckResponse(BaseModel):
    pincode: str
    validity: Literal["valid", "unknown"]
    geography: PinGeography | None
    deliverable: bool
    zone: DeliveryZone | None
    reasonCode: Reason
    message: str
    configurationVersion: int
    checkedAt: datetime
    demo: bool


def normalize_pin(value: str) -> str:
    value = value.strip()
    if not re.fullmatch(r"[1-9][0-9]{5}", value):
        raise LocationError("malformed_pin", "Enter a valid six-digit Indian PIN code.", 400)
    return value


async def current_reference(db: AsyncSession, settings: Settings):
    mode = settings.serviceability_mode
    if mode == "disabled":
        raise LocationError("reference_unavailable", "PIN reference data is not configured. Please try again later.")
    company = settings.serviceability_company_id
    config = (await db.execute(select(configuration).where(
        configuration.c.company_id == company,
    ).with_for_update(read=True))).mappings().one_or_none()
    source = None if config is None else (await db.execute(select(references).where(
        references.c.id == config["reference_id"],
    ))).mappings().one_or_none()
    now = datetime.now(UTC)
    if (source is None or not source["complete"] or source["verified_at"] > now
            or source["valid_until"] <= now or source["synthetic"] != (mode == "demo")):
        raise LocationError("reference_unavailable", "PIN reference data is unavailable or needs verification. Please try again later.")
    return config, source


async def check_pin(db: AsyncSession, value: str, settings: Settings, *, audit_manual: bool = True) -> PinCheckResponse:
    pin = normalize_pin(value)
    company = settings.serviceability_company_id
    config, source = await current_reference(db, settings)
    now = datetime.now(UTC)
    postal = (await db.execute(select(postal_codes).where(
        postal_codes.c.reference_id == source["id"], postal_codes.c.pincode == pin,
        postal_codes.c.active.is_(True),
    ))).mappings().one_or_none()
    geography = None if postal is None else PinGeography(
        city=postal["city"], district=postal["district"], state=postal["state"], sourceVersion=source["id"],
    )
    zone = None
    reason: Reason = "unknown_pin" if postal is None else "outside_coverage"
    if postal is not None:
        rows = (await db.execute(select(
            memberships.c.active.label("mapping_active"), memberships.c.effective_from,
            memberships.c.effective_until, zones.c.id, zones.c.name, zones.c.active,
            zones.c.operational_status, cities.c.slug, cities.c.name.label("city"),
            cities.c.active.label("city_active"),
        ).join(zones, (zones.c.id == memberships.c.zone_id) & (zones.c.company_id == memberships.c.company_id))
          .join(cities, (cities.c.id == zones.c.city_id) & (cities.c.company_id == zones.c.company_id))
          .where(memberships.c.company_id == company, memberships.c.reference_id == source["id"],
                 memberships.c.pincode == pin))).mappings().all()
        active = [row for row in rows if row["mapping_active"]]
        effective = [row for row in active if row["effective_from"] <= now
                     and (row["effective_until"] is None or now < row["effective_until"])]
        if len(effective) > 1:
            reason = "ambiguous_zone"
        elif effective:
            row = effective[0]
            if not row["active"] or not row["city_active"]:
                reason = "zone_disabled"
            elif row["operational_status"] != "open":
                reason = "zone_paused"
            else:
                reason = "serviceable"
                zone = DeliveryZone(id=row["id"], name=row["name"], cityId=row["slug"], city=row["city"])
        elif active:
            reason = "mapping_not_effective"
        elif rows:
            reason = "mapping_inactive"
    messages = {
        "serviceable": "Great! LYOR delivers to your area.",
        "unknown_pin": "This PIN code was not found in the current postal reference. Check it and try again.",
        "outside_coverage": "Delivery is not available in this area yet.",
        "zone_disabled": "Delivery is currently unavailable in this area.",
        "zone_paused": "Delivery is temporarily paused in this area. Please try again later.",
        "mapping_inactive": "Delivery is currently unavailable for this PIN code.",
        "mapping_not_effective": "Delivery is not currently offered for this PIN code.",
        "ambiguous_zone": "Delivery coverage needs verification. Please try again later.",
    }
    if audit_manual:
        await db.execute(insert(audit).values(
            id=str(uuid4()), company_id=company, pincode=pin, reason_code=reason,
            configuration_revision=config["revision"], source="manual",
        ))
    return PinCheckResponse(
        pincode=pin, validity="unknown" if postal is None else "valid", geography=geography,
        deliverable=reason == "serviceable", zone=zone, reasonCode=reason,
        message=messages[reason], configurationVersion=config["revision"], checkedAt=now,
        demo=source["synthetic"],
    )
