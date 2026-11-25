# LYOR marketplace architecture

The approved target is a Python 3.12 FastAPI modular monolith with Uvicorn, Pydantic v2, PostgreSQL, SQLAlchemy 2, Alembic, and Celery with Redis. The existing Next.js App Router, React, TypeScript, Tailwind CSS, UI components, and same-origin browser workflows are the parity reference. FastAPI publishes OpenAPI for generated TypeScript contracts. Web, API, and worker processes deploy independently on GCP.

| Boundary | Authority |
| --- | --- |
| Odoo 19 | Authoritative SKUs, stock, commercial orders, invoices, and accounting |
| Atlas | Fulfilment, delivery, installation, maintenance, and operational evidence |
| PMS | Property, site, room, and asset assignments |
| LYOR | Catalogue presentation, sessions, carts, quotes, order projections, and integration outbox |

| Design | Scope |
| --- | --- |
| [FastAPI high-level design](architecture/fastapi-hld.md) | Domain and runtime boundaries |
| [FastAPI low-level design](architecture/fastapi-lld.md) | Router, API, transaction, and compatibility contracts |
| [Database design](architecture/database-design.md) | Eight-table preservation and Alembic adoption |
| [Celery design](architecture/celery-worker-design.md) | Dispatch, processing, and queue reconciliation |
| [GCP deployment](architecture/gcp-deployment.md) | Service topology, verification, and rollback |

The [historical architecture](../doc/architecture.md) describes the current legacy implementation. The [master plan](MASTER_IMPLEMENTATION_PLAN.md) records approved changes and evidence.
