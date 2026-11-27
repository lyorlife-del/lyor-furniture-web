import re
from typing import Annotated

from fastapi import APIRouter, HTTPException, Query, Request, Response
from fastapi.exceptions import RequestValidationError
from pydantic import ValidationError
from sqlalchemy import func, or_, select

from app.db.models import Product

from .common import AppSettings, DEMO_PINS, VALIDATION, Db, public_listing, record
from .location import catalogue_city
from .pricing import listing_available
from .contracts import CatalogQuery, CatalogResponse, CityResponse, ProductResponse, ServiceabilityResponse

router = APIRouter(tags=["Catalog"])
PAGE_SIZE = 8


def public_product(product: Product) -> dict:
    data = record(product)
    for key in ("stock", "sku", "companyId", "active", "published"):
        del data[key]
    return {**data, "available": product.stock > 0, "demo": True}


async def scoped_products(db, products, city):
    ids = {part["productId"] for item in products for part in item.components}
    parts = {p.id: p for p in await db.scalars(select(Product).where(Product.id.in_(ids), *public_listing(city)))} if ids else {}
    rows = []
    for item in products:
        row = public_product(item)
        row["available"] = bool(city and listing_available(item, city) and item.stock > 0 and all(
            (part := parts.get(required["productId"])) and not part.components and part.stock >= required["quantity"]
            for required in item.components
        ))
        rows.append(row)
    return rows


async def list_products(query: CatalogQuery, db: Db, settings: AppSettings = None) -> dict:
    contextual = query.deliveryPin is not None
    city = await catalogue_city(db, query.deliveryPin, settings) if contextual else query.city
    conditions = public_listing(city)
    if contextual and city is None:
        conditions.append(False)
    if query.mode == "buy":
        conditions.append(Product.purchase_paise > 0)
    if query.category:
        conditions.append(Product.category == query.category)
    if query.q:
        # Prisma's contains filters are PostgreSQL ILIKE patterns.
        pattern = f"%{query.q}%"
        conditions.append(or_(Product.name.ilike(pattern), Product.description.ilike(pattern)))
    price = Product.purchase_paise if query.mode == "buy" else Product.monthly_paise
    order = {
        "price-asc": price.asc(),
        "price-desc": price.desc(),
        "newest": Product.created_at.desc(),
        "featured": Product.featured.desc(),
    }[query.sort]
    total = await db.scalar(select(func.count()).select_from(Product).where(*conditions))
    products = await db.scalars(
        select(Product)
        .where(*conditions)
        .order_by(order, Product.id.asc())
        .offset((query.page - 1) * PAGE_SIZE)
        .limit(PAGE_SIZE)
    )
    items = products.all()
    return {
        "items": await scoped_products(db, items, city) if contextual else [public_product(product) for product in items],
        "total": total,
        "page": query.page,
        "pageSize": PAGE_SIZE,
        "demo": True,
    }


@router.get("/catalog", operation_id="listCatalog", response_model=CatalogResponse, responses=VALIDATION)
async def catalog(query: Annotated[CatalogQuery, Query()], db: Db, request: Request, response: Response, settings: AppSettings):
    params = request.query_params
    repeats = {key: params.getlist(key) for key in params if len(params.getlist(key)) > 1}
    if repeats:
        try:
            CatalogQuery.model_validate({**dict(params), **repeats})
        except ValidationError as error:
            raise RequestValidationError([
                {**item, "loc": ("query", *item["loc"])} for item in error.errors()
            ]) from None
    if query.deliveryPin is not None:
        response.headers["Cache-Control"] = "no-store"
    return await list_products(query, db, settings)


@router.get("/products/{slug}", operation_id="getProduct", response_model=ProductResponse)
async def product(slug: str, db: Db, request: Request, response: Response, settings: AppSettings, deliveryPin: str | None = None):
    product = await db.scalar(select(Product).where(Product.slug == slug, *public_listing()))
    if product is None:
        raise HTTPException(404, "This listing is unavailable")
    if deliveryPin is not None:
        if len(request.query_params.getlist("deliveryPin")) != 1:
            raise HTTPException(400, "Supply one delivery PIN")
        response.headers["Cache-Control"] = "no-store"
        city = await catalogue_city(db, deliveryPin, settings)
        return (await scoped_products(db, [product], city))[0]
    return public_product(product)


@router.get("/bundles", operation_id="listBundles", response_model=CatalogResponse)
async def bundles(db: Db):
    return await list_products(CatalogQuery(category="bundles"), db)


@router.get("/cities", operation_id="listCities", response_model=list[CityResponse], tags=["Serviceability"])
async def cities():
    return [{"id": "noida", "name": "Noida", "demo": True}]


@router.get(
    "/serviceability",
    operation_id="checkServiceability",
    response_model=ServiceabilityResponse,
    responses=VALIDATION,
    tags=["Serviceability"],
)
async def serviceability(request: Request, pin: str | None = None):
    if pin is None or len(request.query_params.getlist("pin")) != 1 or not re.fullmatch(r"[0-9]{6}", pin):
        raise HTTPException(400, "Enter a six-digit PIN")
    deliverable = pin in DEMO_PINS
    return {
        "pin": pin,
        "city": "noida",
        "deliverable": deliverable,
        "demo": True,
        "message": (
            "Covered by the synthetic Noida demo zone." if deliverable
            else "This area is outside our demo coverage. Send an enquiry."
        ),
    }
