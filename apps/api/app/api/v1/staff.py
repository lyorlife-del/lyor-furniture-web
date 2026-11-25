from fastapi import APIRouter, HTTPException
from sqlalchemy import select

from app.db.models import AuditLog, OrderIntent, OutboxEvent, Product
from app.workers.state import MANUAL_REVIEW

from .common import DEMO_COMPANY, VALIDATION, Admin, Db, Staff, legacy_time, record
from .contracts import AdminProductResponse, OutboxResponse, PublishDto

router = APIRouter(prefix="/admin", tags=["Admin"])


@router.get("/catalog", operation_id="adminCatalog", response_model=list[AdminProductResponse])
async def admin_catalog(db: Db, staff: Staff):
    products = await db.scalars(select(Product).where(
        Product.company_id == DEMO_COMPANY,
    ).order_by(Product.name.asc()))
    return [record(product) for product in products]


@router.patch("/catalog/{id}", operation_id="publishListing", response_model=AdminProductResponse, responses=VALIDATION)
async def publish(id: str, body: PublishDto, db: Db, staff: Staff):
    async with db.begin():
        product = await db.scalar(select(Product).where(
            Product.id == id, Product.company_id == DEMO_COMPANY,
        ).with_for_update())
        if product is None:
            raise HTTPException(404, "Listing not found")
        if body.published and not product.active:
            raise HTTPException(409, "Inactive SKUs cannot be published")
        previous = product.published
        product.published = body.published
        db.add(AuditLog(
            actor_id=staff.id,
            action="listing.published" if body.published else "listing.unpublished",
            entity_id=id, detail={"previous": previous, "published": body.published},
        ))
        return record(product)


@router.get("/exceptions", operation_id="integrationExceptions", response_model=list[OutboxResponse])
async def exceptions(db: Db, admin: Admin):
    events = await db.scalars(select(OutboxEvent).where(
        OutboxEvent.status.in_(["failed", "pending", "queued"]),
    ).order_by(OutboxEvent.created_at.desc()).limit(100))
    return [record(event) for event in events]


@router.post("/exceptions/{id}/replay", status_code=201, operation_id="replayException", response_model=OutboxResponse)
async def replay(id: str, db: Db, admin: Admin):
    async with db.begin():
        event = await db.scalar(select(OutboxEvent).where(
            OutboxEvent.id == id, OutboxEvent.status == "failed",
        ).with_for_update())
        if event is None:
            raise HTTPException(409, "Only failed events can be replayed")
        order = await db.get(OrderIntent, event.order_id)
        if (event.last_error or "").startswith(MANUAL_REVIEW) or (
            order.external_id is not None and order.external_id != "DEMO-" + order.id
        ):
            raise HTTPException(409, "Resolve manual reconciliation before requesting replay")
        order.order_state = "pending"
        order.failure_reason = None
        order.updated_at = legacy_time()
        db.add(AuditLog(
            actor_id=admin.id, action="integration.replay", entity_id=id,
            detail={"previousAttempts": event.attempts},
        ))
        event.status = "pending"
        event.available_at = legacy_time()
        event.lease_until = None
        event.last_error = None
        event.attempts = 0
        return record(event)
