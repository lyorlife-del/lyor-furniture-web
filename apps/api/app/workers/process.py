from datetime import timedelta
from logging import getLogger

from fastapi import HTTPException
from sqlalchemy import select, update
from sqlalchemy.orm import Session, sessionmaker

from app.api.v1.common import DEMO_COMPANY, iso_time, legacy_time
from app.api.v1.pricing import validate_demand
from app.db.models import AuditLog, OrderIntent, OutboxEvent, Product, Reservation

from .state import MANUAL_REVIEW, MAX_ATTEMPTS

logger = getLogger(__name__)
CONFIRMED_ACTION = "order.demo_confirmed"
MOCK_EVIDENCE = {"authoritativeSystem": "local-demo-only"}


class ManualReconciliation(Exception):
    pass


class DemoUnavailable(Exception):
    pass


def reconcile_previous_result(db: Session, order: OrderIntent) -> bool:
    reservations = db.scalars(select(Reservation).where(Reservation.order_id == order.id)).all()
    audit = db.scalar(select(AuditLog.id).where(
        AuditLog.entity_id == order.id,
        AuditLog.action == CONFIRMED_ACTION,
        AuditLog.actor_id == "demo-worker",
        AuditLog.detail == MOCK_EVIDENCE,
    ).limit(1))
    if order.external_id is None and not reservations and audit is None:
        return False
    if (
        order.external_id == "DEMO-" + order.id
        and order.stock_state == "reserved_demo"
        and audit is not None
        and reservations
        and all(item.quantity > 0 for item in reservations)
    ):
        order.order_state = "confirmed_demo"
        order.failure_reason = None
        return True
    raise ManualReconciliation("order reference, reservation, or audit evidence is inconsistent")


def reserve_demo_order(db: Session, order: OrderIntent) -> None:
    products = {
        product.id: product
        for product in db.scalars(select(Product).where(Product.company_id == order.company_id))
    }
    if not order.lines:
        raise HTTPException(400, "Your cart is empty")
    demand = validate_demand(order.lines, products, order.city)
    # A consistent lock order prevents bundles from competing in opposite SKU order.
    for product_id, quantity in sorted(demand.items()):
        changed = db.execute(
            update(Product)
            .where(
                Product.id == product_id,
                Product.company_id == order.company_id,
                Product.active.is_(True),
                Product.published.is_(True),
                Product.cities.contains([order.city]),
                Product.stock >= quantity,
            )
            .values(stock=Product.stock - quantity)
        )
        if changed.rowcount != 1:
            raise HTTPException(409, "An item is no longer available")
        db.add(Reservation(order_id=order.id, product_id=product_id, quantity=quantity))
    db.add(AuditLog(
        actor_id="demo-worker", action=CONFIRMED_ACTION, entity_id=order.id,
        detail=MOCK_EVIDENCE,
    ))
    order.external_id = "DEMO-" + order.id
    order.order_state = "confirmed_demo"
    order.stock_state = "reserved_demo"
    order.failure_reason = None


def fail_event(
    event: OutboxEvent, order: OrderIntent, message: str, *, manual: bool = False,
) -> str:
    event.status = "failed"
    event.last_error = message
    event.lease_until = None
    order.failure_reason = message
    if order.external_id is None:
        order.order_state = "failed"
    return "manual-review" if manual else "failed"


def retry_or_fail(event: OutboxEvent, order: OrderIntent, message: str) -> str:
    event.attempts += 1
    order.attempts += 1
    if event.attempts >= MAX_ATTEMPTS:
        return fail_event(event, order, message)
    event.status = "pending"
    event.last_error = message
    event.lease_until = None
    event.available_at = legacy_time(timedelta(seconds=1.5 * 2 ** (event.attempts - 1)))
    order.failure_reason = message
    return "retry-scheduled"


def process_delivery(
    sessions: sessionmaker[Session], event_id: str, lease: str, *, simulate_outage: bool,
) -> str:
    with sessions.begin() as db:
        event = db.get(OutboxEvent, event_id, with_for_update=True)
        if (
            event is None
            or event.status != "queued"
            or event.lease_until is None
            or iso_time(event.lease_until) != lease
        ):
            return "ignored"
        order = db.get(OrderIntent, event.order_id, with_for_update=True)
        try:
            with db.begin_nested():
                if order.company_id != DEMO_COMPANY:
                    raise ManualReconciliation("order is outside the local demo company")
                if not reconcile_previous_result(db, order):
                    if event.attempts >= MAX_ATTEMPTS:
                        return fail_event(event, order, event.last_error or "Retry budget exhausted")
                    if simulate_outage:
                        raise DemoUnavailable("Simulated ERP outage")
                    reserve_demo_order(db, order)
        except ManualReconciliation as error:
            logger.warning("Outbox event %s requires manual reconciliation", event.id)
            return fail_event(event, order, f"{MANUAL_REVIEW} {error}", manual=True)
        except (HTTPException, DemoUnavailable) as error:
            message = error.detail if isinstance(error, HTTPException) else str(error)
            return retry_or_fail(event, order, message)
        event.status = "done"
        event.last_error = None
        event.lease_until = None
        return "done"
