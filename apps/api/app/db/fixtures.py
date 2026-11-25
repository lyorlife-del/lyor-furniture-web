import argparse
import asyncio
import json
from pathlib import Path

from sqlalchemy import text
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncConnection, create_async_engine

from app.core.config import load_settings
from app.db.local import local_fixture_url
from app.db.models import Product

DEMO_PRODUCTS = Path(__file__).with_name("demo-products.json")
PILOT_PRODUCTS = Path(__file__).parents[2] / "prisma" / "pilot-products.json"
CATEGORIES = {
    "Bedroom": "bedroom",
    "Dining": "dining",
    "Living": "living",
    "Accessories": "accessories",
    "Storage": "storage",
}


async def seed_demo(connection: AsyncConnection) -> int:
    products = json.loads(DEMO_PRODUCTS.read_text(encoding="utf-8"))
    statement = insert(Product.__table__).on_conflict_do_nothing(index_elements=["id"])
    await connection.execute(statement, products)
    return len(products)


async def import_pilot(connection: AsyncConnection) -> int:
    products = json.loads(PILOT_PRODUCTS.read_text(encoding="utf-8"))
    table = Product.__table__
    for product in products:
        sku, tier, count = product["sku"], product["tier"], product["designCount"]
        identifier = "pilot-" + sku.lower()
        option = "option" if count == 1 else "options"
        changes = {
            "name": f"{product['name']} ({tier})",
            "category": CATEGORIES[product["category"]],
            "description": f"{count} design {option} in the pilot price list.",
            "monthlyPaise": product["monthlyPaise"],
        }
        statement = insert(table).values(
            id=identifier,
            sku=sku,
            slug=identifier,
            companyId="lyor-demo",
            image="",
            images=[],
            material="",
            dimensions="",
            color="",
            stock=0,
            purchasePaise=0,
            cities=["noida"],
            components=[],
            variants=[{"id": "standard", "name": tier, "monthlyDeltaPaise": 0}],
            **changes,
        )
        statement = statement.on_conflict_do_update(
            index_elements=["sku"],
            set_=changes,
            where=(table.c.id == identifier) & (table.c.companyId == "lyor-demo"),
        ).returning(table.c.id)
        if (await connection.execute(statement)).scalar_one_or_none() is None:
            raise ValueError(f"SKU already belongs to another listing: {sku}")
    return len(products)


async def load_products(action: str) -> int:
    engine = create_async_engine(local_fixture_url(load_settings()))
    try:
        async with engine.begin() as connection:
            await connection.execute(text("SET LOCAL search_path TO public"))
            task = seed_demo if action == "seed-demo" else import_pilot
            return await task(connection)
    finally:
        await engine.dispose()


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("action", choices=["seed-demo", "import-pilot"])
    args = parser.parse_args()
    try:
        count = asyncio.run(load_products(args.action), loop_factory=asyncio.SelectorEventLoop)
    except (ValueError, RuntimeError) as error:
        parser.exit(1, f"{error}\n")
    print(f"{args.action}: verified {count} synthetic catalog entries")
