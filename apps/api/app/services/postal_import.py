"""Reviewed offline imports; no public writes and no inferred geographic coverage."""

import argparse
import asyncio
import hashlib
import json
from datetime import UTC, datetime
from pathlib import Path
from typing import Annotated, Literal
from uuid import uuid4

from pydantic import AwareDatetime, BaseModel, ConfigDict, Field, StringConstraints, model_validator
from sqlalchemy import insert, select, update
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine

from app.core.config import load_settings
from app.db.local import local_fixture_url
from app.db.models import AuditLog
from app.db.serviceability import cities, configuration, memberships, postal_areas, postal_codes, references, zones

Name = Annotated[str, StringConstraints(min_length=1, max_length=200)]
Identifier = Annotated[str, StringConstraints(pattern=r"^[a-zA-Z0-9][a-zA-Z0-9_-]{0,79}$")]
Pin = Annotated[str, StringConstraints(pattern=r"^[1-9][0-9]{5}$")]
Scope = Literal["delhi-nct", "gurugram-city", "outside", "unverified", "demo-noida"]


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)


class Reference(StrictModel):
    id: Identifier
    source: Name
    license: Name
    verifiedAt: AwareDatetime
    validUntil: AwareDatetime
    complete: bool
    synthetic: bool

    @model_validator(mode="after")
    def dates(self):
        if self.validUntil <= self.verifiedAt:
            raise ValueError("Reference expiry must follow verification.")
        return self


class Area(StrictModel):
    id: Identifier
    scope: Scope
    evidence: Name


class PostalCode(StrictModel):
    pincode: Pin
    city: Name | None
    district: Name | None
    state: Name
    country: Literal["IN"]
    active: bool
    areas: list[Area] = Field(min_length=1, max_length=50)


class Zone(StrictModel):
    id: Identifier
    cityId: Identifier
    city: Name
    name: Name
    scope: Literal["delhi-nct", "gurugram-city", "demo-noida"]
    active: bool
    status: Literal["open", "paused", "closed"]
    effectiveFrom: AwareDatetime
    effectiveUntil: AwareDatetime | None = None
    pincodes: list[Pin] = Field(min_length=1, max_length=200000)


class PostalManifest(StrictModel):
    companyId: Identifier
    reference: Reference
    postalCodes: list[PostalCode] = Field(min_length=1, max_length=200000)
    zones: list[Zone] = Field(max_length=2000)

    @model_validator(mode="after")
    def review_mapping(self):
        codes = {row.pincode: row for row in self.postalCodes}
        if len(codes) != len(self.postalCodes):
            raise ValueError("Duplicate PIN rows; combine postal-office aliases into areas first.")
        if len({zone.id for zone in self.zones}) != len(self.zones):
            raise ValueError("Duplicate zone identifiers.")
        assigned = set()
        city_definitions = {}
        for zone in self.zones:
            if zone.effectiveUntil is not None and zone.effectiveUntil <= zone.effectiveFrom:
                raise ValueError("Zone effective dates are reversed.")
            if (zone.scope == "demo-noida") and not self.reference.synthetic:
                raise ValueError("Noida is not an approved live coverage scope.")
            definition = (zone.city, zone.scope)
            if zone.cityId in city_definitions and city_definitions[zone.cityId] != definition:
                raise ValueError("A city identifier must have one name and coverage scope.")
            city_definitions[zone.cityId] = definition
            for pin in zone.pincodes:
                if pin in assigned:
                    raise ValueError("A PIN may be assigned to only one zone in an activation snapshot.")
                row = codes.get(pin)
                if row is None or not row.active or {area.scope for area in row.areas} != {zone.scope}:
                    raise ValueError("Zone PIN requires active postal data and unambiguous approved area evidence.")
                assigned.add(pin)
        for row in self.postalCodes:
            if len({area.id for area in row.areas}) != len(row.areas):
                raise ValueError("Duplicate administrative area identifiers for a PIN.")
        return self


def reference_digest(manifest: PostalManifest) -> str:
    payload = {"reference": manifest.reference.model_dump(mode="json"),
               "postalCodes": [row.model_dump(mode="json") for row in manifest.postalCodes]}
    return hashlib.sha256(json.dumps(payload, sort_keys=True, separators=(",", ":")).encode()).hexdigest()


async def stage_reference(db: AsyncSession, manifest: PostalManifest, *, source_reviewed: bool) -> None:
    if not manifest.reference.synthetic and not source_reviewed:
        raise ValueError("A non-synthetic source requires explicit --reviewed-source after source approval.")
    source = manifest.reference
    digest = reference_digest(manifest)
    created = (await db.execute(pg_insert(references).values(
        id=source.id, source=source.source, license=source.license, checksum=digest,
        verified_at=source.verifiedAt, valid_until=source.validUntil,
        complete=source.complete, synthetic=source.synthetic,
    ).on_conflict_do_nothing(index_elements=[references.c.id]).returning(references.c.id))).scalar_one_or_none()
    if created is None:
        previous = (await db.execute(select(references.c.checksum).where(references.c.id == source.id))).scalar_one()
        if previous != digest:
            raise ValueError("Reference versions are immutable. Use a new source version ID.")
        return
    # Bounded batches avoid one SQL parameter list for a national dataset.
    for offset in range(0, len(manifest.postalCodes), 1000):
        batch = manifest.postalCodes[offset:offset + 1000]
        await db.execute(insert(postal_codes), [{
            "reference_id": source.id, "pincode": row.pincode, "country": row.country,
            "city": row.city, "district": row.district, "state": row.state, "active": row.active,
        } for row in batch])
        await db.execute(insert(postal_areas), [{
            "reference_id": source.id, "pincode": row.pincode, "area_id": area.id,
            "coverage_scope": area.scope, "evidence": area.evidence,
        } for row in batch for area in row.areas])


async def activate_manifest(db: AsyncSession, manifest: PostalManifest, *, actor: str) -> int:
    source = manifest.reference
    now = datetime.now(UTC)
    if not source.complete or not source.verifiedAt <= now < source.validUntil:
        raise ValueError("Activation requires a current, verified, complete reference.")
    # This lock serializes all supported configuration writes and final readers.
    await db.execute(pg_insert(configuration).values(
        company_id=manifest.companyId, reference_id=None, revision=0, updated_by=actor,
    ).on_conflict_do_nothing())
    previous = (await db.execute(select(configuration).where(
        configuration.c.company_id == manifest.companyId,
    ).with_for_update())).mappings().one()
    if (await db.execute(select(references.c.checksum).where(references.c.id == source.id))).scalar_one_or_none() != reference_digest(manifest):
        raise ValueError("Stage the exact reviewed reference before activation.")
    previous_zones = [dict(row) for row in (await db.execute(select(
        zones.c.id, zones.c.city_id, zones.c.name, zones.c.active, zones.c.operational_status,
    ).where(zones.c.company_id == manifest.companyId).order_by(zones.c.id))).mappings()]
    await db.execute(update(memberships).where(memberships.c.company_id == manifest.companyId).values(active=False))
    await db.execute(update(zones).where(zones.c.company_id == manifest.companyId).values(active=False, updated_at=now))
    await db.execute(update(cities).where(cities.c.company_id == manifest.companyId).values(active=False))
    for zone in manifest.zones:
        city_id, zone_id = f"{manifest.companyId}:{zone.cityId}", f"{manifest.companyId}:{zone.id}"
        city_values = dict(name=zone.city, coverage_scope=zone.scope, active=True)
        await db.execute(pg_insert(cities).values(
            id=city_id, company_id=manifest.companyId, slug=zone.cityId, **city_values,
        ).on_conflict_do_update(index_elements=[cities.c.id], set_=city_values))
        zone_values = dict(city_id=city_id, name=zone.name, active=zone.active, operational_status=zone.status, updated_at=now)
        await db.execute(pg_insert(zones).values(
            id=zone_id, company_id=manifest.companyId, **zone_values,
        ).on_conflict_do_update(index_elements=[zones.c.id], set_=zone_values))
        for offset in range(0, len(zone.pincodes), 1000):
            await db.execute(insert(memberships), [{
                "id": str(uuid4()), "company_id": manifest.companyId, "zone_id": zone_id,
                "reference_id": source.id, "pincode": pin, "active": True,
                "effective_from": zone.effectiveFrom, "effective_until": zone.effectiveUntil,
            } for pin in zone.pincodes[offset:offset + 1000]])
    revision = previous["revision"] + 1
    await db.execute(update(configuration).where(configuration.c.company_id == manifest.companyId).values(
        reference_id=source.id, revision=revision, updated_by=actor, updated_at=now,
    ))
    db.add(AuditLog(actor_id=actor, action="serviceability.configuration_activated", entity_id=manifest.companyId,
                    detail={"previousRevision": previous["revision"], "revision": revision,
                            "previousReference": previous["reference_id"], "reference": source.id,
                            "checksum": reference_digest(manifest), "synthetic": source.synthetic,
                            "previousZones": previous_zones,
                            "zones": [{"id": zone.id, "cityId": zone.cityId, "name": zone.name,
                                       "active": zone.active, "status": zone.status,
                                       "pinCount": len(zone.pincodes)} for zone in manifest.zones]}))
    return revision


async def apply_manifest(manifest: PostalManifest, *, activate: bool, reviewed: bool, actor: str) -> None:
    settings = load_settings()
    # Reuse the local/test-only boundary. Production and network database targets are rejected.
    engine = create_async_engine(local_fixture_url(settings))
    try:
        async with AsyncSession(engine) as db, db.begin():
            await stage_reference(db, manifest, source_reviewed=reviewed)
            if activate:
                await activate_manifest(db, manifest, actor=actor)
    finally:
        await engine.dispose()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("manifest", type=Path)
    parser.add_argument("--apply", action="store_true", help="Stage reference on a guarded local/test database.")
    parser.add_argument("--activate", action="store_true", help="Activate the reviewed zone snapshot; requires --apply.")
    parser.add_argument("--reviewed-source", action="store_true", help="Confirm a non-synthetic source was independently approved.")
    parser.add_argument("--actor", default="local-operator")
    args = parser.parse_args()
    try:
        if args.activate and not args.apply:
            raise ValueError("--activate requires --apply.")
        if not args.actor.strip() or len(args.actor) > 80:
            raise ValueError("Provide a non-empty actor of at most 80 characters.")
        manifest = PostalManifest.model_validate_json(args.manifest.read_bytes())
        if not manifest.reference.synthetic and not args.reviewed_source:
            raise ValueError("Non-synthetic input requires --reviewed-source after source approval.")
        if args.apply:
            asyncio.run(apply_manifest(manifest, activate=args.activate, reviewed=args.reviewed_source, actor=args.actor),
                        loop_factory=asyncio.SelectorEventLoop)
    except (OSError, ValueError, RuntimeError, SQLAlchemyError):
        parser.exit(1, "Postal import failed. Check the reviewed manifest, actor, flags and local database configuration.\n")
    print(f"{'Activated' if args.activate else 'Staged' if args.apply else 'Validated'} {len(manifest.postalCodes)} postal rows ({'synthetic demo' if manifest.reference.synthetic else 'reviewed reference'}).")


if __name__ == "__main__":
    main()
