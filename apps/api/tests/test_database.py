import json
from asyncio import SelectorEventLoop
from datetime import datetime
from os import getenv
from uuid import UUID

import pytest
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine

from app.core.config import Settings
from app.db.fixtures import DEMO_PRODUCTS, PILOT_PRODUCTS, import_pilot, seed_demo
from app.db.local import local_fixture_url
from app.db.models import Cart, OrderIntent, OutboxEvent, Product, Quote


@pytest.fixture
def anyio_backend():
    return "asyncio", {"loop_factory": SelectorEventLoop}


def fixture_settings(url: str) -> Settings:
    return Settings(
        environment="test",
        demo_mode=True,
        database_url=url,
        quote_secret="isolated-phase-two-synthetic-quote-secret",
    )


@pytest.mark.parametrize(
    "url",
    [
        "postgresql://lyor_test@db.example.invalid:5433/lyor_test_db",
        "postgresql://lyor_test@127.0.0.1:5432/lyor_test_db",
        "postgresql://lyor_test@127.0.0.1:5433/lyor",
        "postgresql://lyor_test@127.0.0.1:5433/lyor_test_db?hostaddr=192.0.2.1",
    ],
)
def test_fixture_target_guard(url):
    with pytest.raises(ValueError, match="isolated LYOR test database"):
        local_fixture_url(fixture_settings(url))


@pytest.fixture
async def connection():
    dsn = getenv("LYOR_PHASE02_TEST_DATABASE_URL")
    if not dsn:
        pytest.skip("set LYOR_PHASE02_TEST_DATABASE_URL to the freshly migrated test database")
    engine = create_async_engine(local_fixture_url(fixture_settings(dsn)))
    try:
        async with engine.connect() as db:
            yield db  # Closing the connection rolls back the test transaction.
    finally:
        await engine.dispose()


@pytest.mark.anyio
async def test_fixture_loaders_preserve_existing_inventory_and_publication(connection):
    demo = json.loads(DEMO_PRODUCTS.read_text(encoding="utf-8"))
    pilot = json.loads(PILOT_PRODUCTS.read_text(encoding="utf-8"))
    products = Product.__table__
    assert await seed_demo(connection) == len(demo)
    assert await import_pilot(connection) == len(pilot)
    await connection.execute(
        update(products)
        .where(products.c.id.in_([demo[0]["id"], "pilot-b07"]))
        .values(stock=17, published=False, monthlyPaise=1)
    )
    assert await seed_demo(connection) == len(demo)
    assert await import_pilot(connection) == len(pilot)
    rows = (await connection.execute(select(products))).mappings()
    by_id = {row["id"]: row for row in rows}
    assert len(by_id) == len(demo) + len(pilot)
    assert by_id[demo[0]["id"]]["monthlyPaise"] == 1
    for item in pilot:
        assert by_id["pilot-" + item["sku"].lower()]["monthlyPaise"] == item["monthlyPaise"]
    for product_id in (demo[0]["id"], "pilot-b07"):
        assert by_id[product_id]["stock"] == 17 and not by_id[product_id]["published"]


@pytest.mark.anyio
async def test_pilot_import_rolls_back_on_a_foreign_sku(connection):
    pilot = json.loads(PILOT_PRODUCTS.read_text(encoding="utf-8"))
    products = Product.__table__
    await import_pilot(connection)
    earlier_id = "pilot-" + pilot[0]["sku"].lower()
    conflicting_id = "pilot-" + pilot[-1]["sku"].lower()
    await connection.execute(
        update(products).where(products.c.id == earlier_id).values(monthlyPaise=1)
    )
    await connection.execute(
        update(products).where(products.c.id == conflicting_id).values(companyId="foreign")
    )
    with pytest.raises(ValueError, match="SKU already belongs"):
        async with connection.begin_nested():
            await import_pilot(connection)
    assert await connection.scalar(
        select(products.c.monthlyPaise).where(products.c.id == earlier_id)
    ) == 1


@pytest.mark.anyio
async def test_orm_generated_ids_timestamps_and_order_relationships(connection):
    async with AsyncSession(bind=connection) as session:
        cart = Cart(owner_id="phase02-demo")
        quote = Quote(
            cart=cart, cart_revision=0, city="noida", pin="201304",
            lines=[], breakdown={"totalPaise": 100}, policy_version="demo",
            signature="0" * 64, expires_at=datetime(2027, 1, 1),
        )
        order = OrderIntent(
            quote=quote, owner_id="phase02-demo", idempotency_key="synthetic-key",
            request_hash="synthetic-hash", city="noida", address={}, lines=[], breakdown={},
        )
        event = OutboxEvent(order=order)
        session.add(event)
        await session.flush()
        assert UUID(cart.id).version == 4 and UUID(event.id).version == 4
        assert quote.cart_id == cart.id and order.quote_id == quote.id
        assert event.order_id == order.id
        assert cart.revision == 0 and cart.lines == []
        assert order.order_state == "pending" and event.status == "pending"
        assert order.updated_at >= cart.updated_at
        old_time = datetime(2000, 1, 1)
        cart.updated_at = old_time
        await session.flush()
        cart.revision = 1
        await session.flush()
        assert cart.updated_at > old_time
