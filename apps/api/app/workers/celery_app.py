from celery import Celery

QUEUE = "lyor-celery-orders"
PROCESS_ORDER = "lyor.orders.process_demo"


def create_celery(redis_url: str) -> Celery:
    app = Celery("lyor_marketplace", broker=redis_url)
    app.conf.update(
        task_default_queue=QUEUE,
        task_default_exchange=QUEUE,
        task_default_routing_key=QUEUE,
        task_serializer="json",
        accept_content=["json"],
        task_ignore_result=True,
        task_acks_late=True,
        task_reject_on_worker_lost=True,
        worker_prefetch_multiplier=1,
        worker_enable_remote_control=False,
        broker_connection_timeout=2,
        broker_transport_options={
            "visibility_timeout": 120,
            "socket_connect_timeout": 2,
            "socket_timeout": 2,
        },
    )
    return app
