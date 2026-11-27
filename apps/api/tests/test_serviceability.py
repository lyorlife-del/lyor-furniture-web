import asyncio
import json
from asyncio import SelectorEventLoop
from datetime import UTC, datetime, timedelta
from os import getenv
from pathlib import Path
from uuid import uuid4

import httpx
import pytest
from asgi_lifespan import LifespanManager
from pydantic import ValidationError
from sqlalchemy import func, insert, select, update
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine

from app.api.v1.common import get_db
from app.core.config import Settings
from app.db.local import local_fixture_url
from app.db.models import AuditLog
from app.db.serviceability import audit, cities, configuration, memberships, references, zones
from app.main import create_app
from app.services.postal_import import PostalManifest, activate_manifest, stage_reference
from app.services.serviceability import LocationError, check_pin, normalize_pin

FIXTURE = Path(__file__).with_name("fixtures") / "postal-demo.json"


def manifest(**changes):
    raw = json.loads(FIXTURE.read_text(encoding="utf-8"))
    raw.update(changes)
    return PostalManifest.model_validate_json(json.dumps(raw))


def settings(**changes):
    return Settings(environment="test", demo_mode=True,
                    database_url=getenv("LYOR_LOC01_TEST_DATABASE_URL", "postgresql://lyor_test@127.0.0.1:5433/lyor_test_unconfigured"),
                    quote_secret="isolated-location-tests-secret-32-characters", serviceability_mode="demo", **changes)


@pytest.fixture
def anyio_backend():
    return "asyncio", {"loop_factory": SelectorEventLoop}


@pytest.mark.parametrize("value", ["", "000000", "012345", "12345", "1234567", "122 002", "12200a", "１２２００２", "१२२००२", "122002\nextra"])
def test_new_pin_format_rejects_bad_inputs(value):
    with pytest.raises(LocationError, match="six-digit"):
        normalize_pin(value)


def test_outer_whitespace_is_normalized_without_modifying_internal_digits():
    assert normalize_pin(" \t122002\n") == "122002"


def test_import_rejects_duplicate_and_unverified_cross_boundary_assignments():
    data = json.loads(FIXTURE.read_text(encoding="utf-8"))
    data["postalCodes"].append(data["postalCodes"][0])
    with pytest.raises(ValidationError, match="Duplicate PIN"):
        PostalManifest.model_validate_json(json.dumps(data))
    data = json.loads(FIXTURE.read_text(encoding="utf-8"))
    data["postalCodes"][0]["areas"].append({"id": "outside-city", "scope": "outside", "evidence": "Unresolved boundary"})
    with pytest.raises(ValidationError, match="unambiguous"):
        PostalManifest.model_validate_json(json.dumps(data))
    data = json.loads(FIXTURE.read_text(encoding="utf-8"))
    data["reference"]["synthetic"] = False
    with pytest.raises(ValidationError, match="Noida"):
        PostalManifest.model_validate_json(json.dumps(data))


@pytest.mark.anyio
async def test_disabled_mode_fails_before_any_database_use_and_preserves_old_endpoint():
    app = create_app(settings().model_copy(update={"serviceability_mode": "disabled"}))
    async with LifespanManager(app), httpx.AsyncClient(transport=httpx.ASGITransport(app), base_url="http://test") as client:
        result = await client.get("/api/v1/serviceability/pincode/122002")
        assert result.status_code == 503 and result.json()["code"] == "reference_unavailable"
        assert result.headers["cache-control"] == "no-store"
        for path in ("/api/v1/serviceability/pincode", "/api/v1/serviceability/pincode/000000", "/api/v1/serviceability/pincode/122002?deliverable=true"):
            response = await client.get(path)
            assert response.status_code == 400
        old = await client.get("/api/v1/serviceability?pin=201304")
        assert old.status_code == 200 and old.json()["demo"] is True


@pytest.fixture
async def db():
    if not getenv("LYOR_LOC01_TEST_DATABASE_URL"):
        pytest.skip("set LYOR_LOC01_TEST_DATABASE_URL to an isolated freshly migrated localhost database")
    engine = create_async_engine(local_fixture_url(settings()))
    try:
        async with engine.connect() as connection, connection.begin():
            async with AsyncSession(bind=connection, join_transaction_mode="create_savepoint") as session:
                yield session
    finally:
        await engine.dispose()


async def prepared(db):
    data = manifest()
    await stage_reference(db, data, source_reviewed=False)
    await activate_manifest(db, data, actor="synthetic-test-operator")
    return data


@pytest.mark.anyio
async def test_real_database_classifies_known_unknown_outside_and_no_slot_fixture(db):
    await prepared(db)
    assert (await check_pin(db, " 122002 ", settings())).reasonCode == "serviceable"
    outside = await check_pin(db, "400001", settings())
    assert outside.validity == "valid" and outside.reasonCode == "outside_coverage" and not outside.deliverable
    assert (await check_pin(db, "999999", settings())).reasonCode == "unknown_pin"
    delhi = await check_pin(db, "110024", settings())
    assert delhi.deliverable and delhi.demo  # Eligibility does not assert that any slot exists.
    assert await db.scalar(select(func.count()).select_from(audit)) == 4
    assert set(audit.c.keys()) == {"id", "company_id", "pincode", "reason_code", "configuration_revision", "source", "created_at"}


@pytest.mark.anyio
async def test_configuration_updates_effective_dates_and_company_isolation(db):
    data = await prepared(db)
    await db.execute(update(zones).where(zones.c.id == "lyor-demo:DEMO-001").values(operational_status="paused"))
    assert (await check_pin(db, "122002", settings())).reasonCode == "zone_paused"
    await db.execute(update(zones).where(zones.c.id == "lyor-demo:DEMO-001").values(operational_status="open", active=False))
    assert (await check_pin(db, "122002", settings())).reasonCode == "zone_disabled"
    revision = await activate_manifest(db, data, actor="synthetic-test-operator")
    result = await check_pin(db, "122002", settings())
    assert result.deliverable and result.configurationVersion == revision == 2
    await db.execute(update(memberships).where(memberships.c.pincode == "122002", memberships.c.active.is_(True))
                     .values(effective_from=datetime.now(UTC) + timedelta(days=1)))
    assert (await check_pin(db, "122002", settings())).reasonCode == "mapping_not_effective"
    await db.execute(update(memberships).where(memberships.c.pincode == "122002").values(active=False))
    assert (await check_pin(db, "122002", settings())).reasonCode == "mapping_inactive"
    with pytest.raises(LocationError, match="unavailable"):
        await check_pin(db, "122002", settings(serviceability_company_id="other-company"))


@pytest.mark.anyio
async def test_ambiguous_mapping_fails_closed_even_if_data_was_modified_outside_importer(db):
    await prepared(db)
    row = dict((await db.execute(select(memberships).where(memberships.c.pincode == "122002"))).mappings().one())
    row["id"] = str(uuid4())
    await db.execute(insert(memberships).values(**row))
    result = await check_pin(db, "122002", settings())
    assert result.reasonCode == "ambiguous_zone" and not result.deliverable


@pytest.mark.anyio
async def test_reference_failure_is_not_reported_as_unknown_pin(db):
    await prepared(db)
    await db.execute(update(references).values(complete=False))
    with pytest.raises(LocationError, match="verification"):
        await check_pin(db, "999999", settings())
    await db.execute(update(references).values(complete=True, valid_until=datetime(2026, 2, 1, tzinfo=UTC)))
    with pytest.raises(LocationError, match="verification"):
        await check_pin(db, "122002", settings())
    await db.execute(update(references).values(valid_until=datetime(2099, 1, 1, tzinfo=UTC)))
    with pytest.raises(LocationError, match="verification"):
        await check_pin(db, "122002", settings().model_copy(update={"serviceability_mode": "reference"}))


@pytest.mark.anyio
async def test_reference_staging_immutability_and_activation_history(db):
    data = manifest()
    await stage_reference(db, data, source_reviewed=False)
    await stage_reference(db, data, source_reviewed=False)
    assert await db.scalar(select(func.count()).select_from(references)) == 1
    with pytest.raises(LocationError):
        await check_pin(db, "122002", settings())  # Stage is not activation.
    changed = data.model_copy(deep=True)
    changed.postalCodes[0].city = "Changed source"
    with pytest.raises(ValueError, match="immutable"):
        await stage_reference(db, changed, source_reviewed=False)
    await activate_manifest(db, data, actor="reviewer")
    history = (await db.scalars(select(AuditLog).where(AuditLog.action == "serviceability.configuration_activated"))).one()
    assert history.actor_id == "reviewer" and history.detail["revision"] == 1
    assert history.detail["previousZones"] == [] and history.detail["zones"][0]["pinCount"] == 1
    await db.execute(update(cities).where(cities.c.slug == "gurugram").values(active=False))
    assert not (await check_pin(db, "122002", settings())).deliverable


@pytest.mark.anyio
async def test_failed_activation_rolls_back_staged_reference_and_postal_rows(db):
    data = manifest()
    data.reference.complete = False
    with pytest.raises(ValueError, match="complete reference"):
        async with db.begin_nested():
            await stage_reference(db, data, source_reviewed=False)
            await activate_manifest(db, data, actor="rollback-test")
    assert await db.scalar(select(func.count()).select_from(references)) == 0
    assert await db.scalar(select(func.count()).select_from(configuration)) == 0


@pytest.mark.anyio
async def test_http_contract_against_postgresql(db):
    await prepared(db)
    await db.commit()
    app = create_app(settings())
    async def override_db():
        yield db
    app.dependency_overrides[get_db] = override_db
    async with LifespanManager(app):
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app), base_url="http://test") as client:
            response = await client.get("/api/v1/serviceability/pincode/%20122002%20")
            assert response.status_code == 200 and response.json()["pincode"] == "122002"
            assert response.json()["zone"]["cityId"] == "gurugram"
            assert response.headers["cache-control"] == "no-store"
            assert (await client.get("/api/v1/serviceability/pincode/400001")).json()["validity"] == "valid"


@pytest.mark.anyio
async def test_concurrent_configuration_activations_serialize_without_duplicate_active_mappings():
    if not getenv("LYOR_LOC01_TEST_DATABASE_URL"):
        pytest.skip("requires the isolated LOC-01 test database")
    data = manifest(companyId="concurrent-test")
    data.reference.id = "concurrent-synthetic-reference"
    engine = create_async_engine(local_fixture_url(settings()))
    try:
        async with AsyncSession(engine) as session, session.begin():
            await stage_reference(session, data, source_reviewed=False)
        async def activate():
            async with AsyncSession(engine) as session, session.begin():
                return await activate_manifest(session, data, actor="concurrency-test")
        assert sorted(await asyncio.gather(activate(), activate())) == [1, 2]
        async with AsyncSession(engine) as session:
            assert await session.scalar(select(func.count()).select_from(memberships).where(
                memberships.c.company_id == "concurrent-test", memberships.c.active.is_(True),
            )) == 3
    finally:
        await engine.dispose()


@pytest.mark.anyio
async def test_preference_ownership_revisions_and_contextual_catalogue(db):
    await prepared(db)
    await db.commit()
    app = create_app(settings())

    async def request_db():
        async with AsyncSession(bind=db.bind, join_transaction_mode="create_savepoint") as request_session:
            yield request_session

    app.dependency_overrides[get_db] = request_db
    path = "/api/v1/location-preference"
    async with LifespanManager(app), httpx.AsyncClient(transport=httpx.ASGITransport(app), base_url="http://test") as client:
        client.cookies.set("lyor-location-guest", str(uuid4()))
        body = {"expectedRevision": 0, "pincode": "122002"}
        saved = await client.put(path, json=body)
        assert saved.status_code == 200 and saved.json()["revision"] == 1
        assert (await client.put(path, json=body)).status_code == 409
        assert (await client.get(path)).json()["selection"]["zone"]["cityId"] == "gurugram"
        a, b = {"Authorization": "Bearer demo-customer-a"}, {"Authorization": "Bearer demo-customer-b"}
        assert (await client.get(path, headers=a)).json()["revision"] == 0
        assert (await client.put(path, headers=a, json={**body, "pincode": "201304"})).status_code == 200
        assert (await client.get(path, headers=b)).json()["selection"] is None
        assert (await client.get(path, headers={"Authorization": "Bearer invalid"})).status_code == 401
        assert (await client.put(path, json={"expectedRevision": 1, "pincode": "400001"})).status_code == 409
        assert (await client.get(path)).json()["revision"] == 1
        city_list = (await client.get("/api/v1/serviceability/cities")).json()
        assert {city["id"] for city in city_list} == {"delhi", "noida", "gurugram"}
        legacy = (await client.get("/api/v1/catalog")).json()
        assert legacy["total"] > 0
        for pin, count in [("201304", legacy["total"]), ("122002", 0), ("400001", 0)]:
            response = await client.get("/api/v1/catalog", params={"deliveryPin": pin})
            assert response.json()["total"] == count and response.headers["cache-control"] == "no-store"
        slug = "mira-sofa"
        for pin, available in [("201304", True), ("122002", False)]:
            response = await client.get(f"/api/v1/products/{slug}", params={"deliveryPin": pin})
            assert response.json()["available"] is available
        await db.execute(update(zones).where(zones.c.id == "lyor-demo:DEMO-001").values(operational_status="paused"))
        await db.commit()
        assert (await client.get(path)).json()["selection"]["reasonCode"] == "zone_paused"


@pytest.mark.anyio
async def test_concurrent_preference_creation_and_replacement():
    if not getenv("LYOR_LOC01_TEST_DATABASE_URL"):
        pytest.skip("requires the isolated location test database")
    company = "preference-concurrency-" + uuid4().hex
    config = settings(serviceability_company_id=company)
    engine = create_async_engine(local_fixture_url(config))
    data = manifest(companyId=company)
    data.reference.id = company
    try:
        async with AsyncSession(engine) as session, session.begin():
            await stage_reference(session, data, source_reviewed=False)
            await activate_manifest(session, data, actor="preference-concurrency-test")
        app = create_app(config)
        async with LifespanManager(app), httpx.AsyncClient(transport=httpx.ASGITransport(app), base_url="http://test") as client:
            client.cookies.set("lyor-location-guest", str(uuid4()))
            path = "/api/v1/location-preference"
            for revision in (0, 1):
                results = await asyncio.gather(*(
                    client.put(path, json={"pincode": pin, "expectedRevision": revision})
                    for pin in ("122002", "201304")
                ))
                assert sorted(result.status_code for result in results) == [200, 409]
                saved = (await client.get(path)).json()
                winner = next(result.json() for result in results if result.status_code == 200)
                assert saved["revision"] == revision + 1
                assert saved["selection"]["pincode"] == winner["selection"]["pincode"]
    finally:
        await engine.dispose()
