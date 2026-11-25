import argparse
import logging
import signal
import sys
from threading import Event
from urllib.parse import urlsplit

from pydantic import SecretStr, field_validator
from sqlalchemy import create_engine
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import NullPool

from app.core.config import Settings
from app.db.local import local_fixture_url

from .celery_app import PROCESS_ORDER, QUEUE, create_celery
from .dispatch import dispatch_once
from .process import process_delivery

logger = logging.getLogger(__name__)


class WorkerSettings(Settings):
    redis_url: SecretStr = SecretStr("redis://127.0.0.1:6379/0")
    demo_odoo_outage: bool = False

    @field_validator("redis_url")
    @classmethod
    def require_local_redis(cls, value: SecretStr) -> SecretStr:
        url = urlsplit(value.get_secret_value())
        if url.scheme != "redis" or url.hostname != "127.0.0.1" or url.query or url.fragment:
            raise ValueError("Use an explicit loopback Redis URL for the local worker")
        return value


def main() -> None:
    parser = argparse.ArgumentParser(description="LYOR demo outbox runtime")
    commands = parser.add_subparsers(dest="command", required=True)
    dispatch = commands.add_parser("dispatch")
    dispatch.add_argument("--once", action="store_true")
    worker = commands.add_parser("worker")
    worker.add_argument("--pool", choices=["solo", "prefork"], default="solo" if sys.platform == "win32" else "prefork")
    args = parser.parse_args()
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")

    settings = WorkerSettings()
    engine = create_engine(local_fixture_url(settings), poolclass=NullPool, connect_args={"connect_timeout": 2})
    sessions = sessionmaker(engine)
    celery = create_celery(settings.redis_url.get_secret_value())
    try:
        if args.command == "worker":
            @celery.task(name=PROCESS_ORDER)
            def process_order(event_id: str, lease: str) -> str:
                outcome = process_delivery(
                    sessions, event_id, lease, simulate_outage=settings.demo_odoo_outage,
                )
                logger.info("Outbox event %s outcome: %s", event_id, outcome)
                return outcome

            celery.worker_main([
                "worker", "--pool", args.pool, "--queues", QUEUE, "--loglevel", "INFO",
                "--concurrency", "1" if args.pool == "solo" else "2",
                "--without-gossip", "--without-mingle",
            ])
        else:
            stop = Event()
            for signum in (signal.SIGINT, signal.SIGTERM):
                signal.signal(signum, lambda *_: stop.set())

            def publish(delivery):
                celery.send_task(
                    PROCESS_ORDER, args=[delivery.event_id, delivery.lease], queue=QUEUE,
                    retry=False,
                )

            while not stop.is_set():
                try:
                    count = dispatch_once(sessions, publish)
                    if count:
                        logger.info("Published %s outbox deliveries", count)
                except SQLAlchemyError:
                    logger.warning("Outbox dispatcher database unavailable")
                    if args.once:
                        raise SystemExit(1) from None
                if args.once:
                    break
                stop.wait(2)
    finally:
        engine.dispose()
        celery.close()


if __name__ == "__main__":
    main()
