"""Project approved Odoo furniture into an isolated, display-only LYOR preview."""

import argparse
import asyncio
from pathlib import Path
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, ValidationError, model_validator
from sqlalchemy import text
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncConnection, create_async_engine

from app.api.v1.common import DEMO_COMPANY
from app.core.config import Settings, load_settings
from app.db.local import local_fixture_url
from app.db.models import Product
from app.integrations.odoo_catalog import CatalogCheckError, OdooProduct, read_configured_products

PUBLIC_MEDIA = Path(__file__).resolve().parents[3] / "web" / "public" / "images"


class PreviewListing(BaseModel):
    model_config = ConfigDict(extra="forbid")

    odoo_id: int = Field(gt=0)
    category: Literal["living", "bedroom", "study", "dining", "accessories", "storage"]
    city: Literal["noida"]
    monthly_paise: int = Field(gt=0, le=2_147_483_647)
    description: str = Field(min_length=1)
    images: list[str] = Field(min_length=1)


class PreviewManifest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    items: list[PreviewListing] = Field(min_length=1, max_length=20)

    @model_validator(mode="after")
    def check_ids(self) -> "PreviewManifest":
        if len({item.odoo_id for item in self.items}) != len(self.items):
            raise ValueError("Each Odoo variant ID must occur once.")
        return self


def preview_database_url(settings: Settings):
    url = local_fixture_url(settings)
    if settings.environment != "test" or not (url.database or "").startswith("lyor_test_odoo_"):
        raise ValueError("Use a disposable lyor_test_odoo_* database on 127.0.0.1:5433.")
    return url


def validate_media(manifest: PreviewManifest) -> None:
    for listing in manifest.items:
        for image in listing.images:
            prefix = "/images/"
            if not image.startswith(prefix) or any(character in image for character in "\\?#%"):
                raise ValueError(f"Odoo variant {listing.odoo_id} requires local /images/ assets.")
            location = (PUBLIC_MEDIA / image.removeprefix(prefix)).resolve()
            if (
                not location.is_relative_to(PUBLIC_MEDIA.resolve())
                or location.suffix.lower() not in {".jpg", ".jpeg", ".png", ".webp", ".avif"}
                or not location.is_file()
                or ".." in Path(image).parts
            ):
                raise ValueError(f"Odoo variant {listing.odoo_id} has a missing or invalid image asset.")


async def write_preview(
    connection: AsyncConnection, manifest: PreviewManifest, products: list[OdooProduct],
) -> None:
    source = {product.id: product for product in products}
    if source.keys() != {listing.odoo_id for listing in manifest.items}:
        raise ValueError("Odoo variants do not match the approved preview manifest.")
    table = Product.__table__
    for listing in sorted(manifest.items, key=lambda item: item.odoo_id):
        product = source[listing.odoo_id]
        identifier = f"odoo-preview-{product.id}"
        presentation = {
            "name": product.name,
            "category": listing.category,
            "description": listing.description,
            "image": listing.images[0],
            "images": listing.images,
            "monthlyPaise": listing.monthly_paise,
            "cities": [listing.city],
        }
        statement = insert(table).values(
            id=identifier, sku=identifier, slug=identifier, companyId=DEMO_COMPANY,
            active=True, published=True, featured=False, stock=0, purchasePaise=0,
            material="", color="", dimensions="", components=[],
            variants=[{"id": "standard", "name": "Standard", "monthlyDeltaPaise": 0}],
            **presentation,
        )
        statement = statement.on_conflict_do_update(
            index_elements=[table.c.id],
            set_=presentation,
            where=(
                (table.c.companyId == DEMO_COMPANY)
                & (table.c.sku == identifier)
                & (table.c.slug == identifier)
                & (table.c.stock == 0)
                & (table.c.purchasePaise == 0)
            ),
        ).returning(table.c.id)
        if (await connection.execute(statement)).scalar_one_or_none() is None:
            raise ValueError(f"Odoo variant {product.id} conflicts with an existing preview listing.")


async def apply_preview(url, manifest: PreviewManifest, products: list[OdooProduct]) -> None:
    engine = create_async_engine(url)
    try:
        async with engine.begin() as connection:
            await connection.execute(text("SET LOCAL search_path TO public"))
            await write_preview(connection, manifest, products)
    finally:
        await engine.dispose()


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("manifest", type=Path)
    parser.add_argument("--apply", action="store_true", help="Write to the dedicated preview database.")
    args = parser.parse_args()
    try:
        url = preview_database_url(load_settings()) if args.apply else None
        manifest = PreviewManifest.model_validate_json(args.manifest.read_bytes(), strict=True)
        validate_media(manifest)
        products = read_configured_products(product_ids=[item.odoo_id for item in manifest.items])
        if url is not None:
            asyncio.run(apply_preview(url, manifest, products), loop_factory=asyncio.SelectorEventLoop)
    except (CatalogCheckError, OSError, RuntimeError, ValueError) as error:
        if isinstance(error, ValidationError):
            parser.exit(1, "Odoo preview failed: invalid manifest fields.\n")
        parser.exit(1, f"Odoo preview failed: {error}\n")
    except SQLAlchemyError:
        parser.exit(1, "Odoo preview failed: database write was rolled back. Check schema and listing conflicts.\n")
    action = "Applied" if args.apply else "Validated"
    print(f"{action} {len(products)} display-only Odoo preview listing(s).")


if __name__ == "__main__":
    main()
