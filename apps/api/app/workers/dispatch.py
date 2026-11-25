from collections.abc import Callable
from dataclasses import dataclass
from datetime import timedelta
from logging import getLogger

from kombu.exceptions import KombuError
from redis.exceptions import RedisError
from sqlalchemy import or_, select
from sqlalchemy.orm import Session, sessionmaker

from app.api.v1.common import iso_time, legacy_time
from app.db.models import OutboxEvent

logger = getLogger(__name__)
LEASE_DURATION = timedelta(seconds=60)


@dataclass(frozen=True)
class Delivery:
    event_id: str
    lease: str


def claim_due_events(sessions: sessionmaker[Session]) -> list[Delivery]:
    now = legacy_time()
    deadline = now + LEASE_DURATION
    with sessions.begin() as db:
        events = db.scalars(
            select(OutboxEvent)
            .where(
                OutboxEvent.status.in_(["pending", "queued"]),
                OutboxEvent.available_at <= now,
                or_(OutboxEvent.lease_until.is_(None), OutboxEvent.lease_until <= now),
            )
            .order_by(OutboxEvent.available_at, OutboxEvent.created_at, OutboxEvent.id)
            .limit(25)
            .with_for_update(skip_locked=True)
        )
        deliveries = []
        for event in events:
            event.status = "queued"
            event.lease_until = deadline
            deliveries.append(Delivery(event.id, iso_time(deadline)))
        return deliveries


def dispatch_once(
    sessions: sessionmaker[Session],
    publish: Callable[[Delivery], None],
) -> int:
    sent = 0
    for delivery in claim_due_events(sessions):
        try:
            publish(delivery)
        except (KombuError, RedisError):
            # The broker may have accepted the message before the error. Keep the
            # lease and let a later claim supersede the old delivery if needed.
            logger.warning("Outbox publish unavailable for %s; lease retained", delivery.event_id)
            break
        sent += 1
    return sent
