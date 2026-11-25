from asyncio import SelectorEventLoop
from os import getenv

import httpx
import pytest
from asgi_lifespan import LifespanManager
from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import create_async_engine

from app.core.config import Settings
from app.db.models import Product
from app.integrations.odoo_catalog import OdooProduct
from app.integrations.odoo_preview import PreviewManifest, preview_database_url, validate_media, write_preview
from app.main import create_app


def manifest(image="/images/nook-chair.jpg", rate=49000):
    return PreviewManifest.model_validate({"items": [{
        "odoo_id": 24, "category": "study", "city": "noida", "monthly_paise": rate,
        "description": "Synthetic fixture for the isolated browser preview.", "images": [image],
    }]})


def settings(url, environment="test"):
    return Settings(environment=environment, demo_mode=True, database_url=url,
                    quote_secret="isolated-phase-five-synthetic-quote-secret")


def test_preview_rejects_shared_database_and_unapproved_media():
    with pytest.raises(ValueError, match="disposable"):
        preview_database_url(settings("postgresql://lyor@127.0.0.1:5432/lyor", "development"))
    with pytest.raises(ValueError, match="local /images/"):
        validate_media(manifest("https://odoo.example/web/image/24"))
    with pytest.raises(ValueError, match="invalid image"):
        validate_media(manifest("/images/../images/nook-chair.jpg"))
    validate_media(manifest())


@pytest.fixture
def anyio_backend():
    return "asyncio", {"loop_factory": SelectorEventLoop}


@pytest.mark.anyio
async def test_preview_projects_display_fields_without_stock_and_preserves_conflicts():
    dsn = getenv("LYOR_PHASE05_TEST_DATABASE_URL")
    if not dsn:
        pytest.skip("set LYOR_PHASE05_TEST_DATABASE_URL to a fresh Odoo preview database")
    configuration = settings(dsn)
    engine = create_async_engine(preview_database_url(configuration))
    product = OdooProduct(id=24, name="Fixture Reading Chair", default_code=None)
    table = Product.__table__
    try:
        async with engine.begin() as connection:
            await write_preview(connection, manifest(), [product])
            await write_preview(connection, manifest(rate=53000), [product])
            assert await connection.scalar(select(func.count()).select_from(table)) == 1

        app = create_app(configuration)
        async with LifespanManager(app):
            async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
                listing = (await client.get("/api/v1/catalog?city=noida&mode=rent")).json()["items"][0]
                detail = await client.get("/api/v1/products/odoo-preview-24")
                buy = (await client.get("/api/v1/catalog?city=noida&mode=buy")).json()
        assert detail.status_code == 200 and detail.json() == listing
        assert listing["name"] == "Fixture Reading Chair" and listing["monthlyPaise"] == 53000
        assert listing["image"] == "/images/nook-chair.jpg" and listing["available"] is False
        assert buy["total"] == 0
        async with engine.begin() as connection:
            await connection.execute(update(table).where(table.c.id == "odoo-preview-24").values(companyId="foreign"))
            with pytest.raises(ValueError, match="conflicts"):
                await write_preview(connection, manifest(rate=68000), [product])
            assert await connection.scalar(select(table.c.monthlyPaise).where(table.c.id == "odoo-preview-24")) == 53000
            await connection.execute(update(table).where(table.c.id == "odoo-preview-24").values(companyId="lyor-demo"))
    finally:
        await engine.dispose()
