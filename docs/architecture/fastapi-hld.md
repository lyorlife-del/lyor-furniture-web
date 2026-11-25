# FastAPI high-level design

The browser uses the existing Next.js routes and same-origin proxy. The proxy and server-rendered pages call FastAPI. Route modules cover identity, public discovery and serviceability, cart and quoting, checkout and orders, B2B enquiries, and staff controls. Future inventory, payment, delivery, and returns integrations require verified contracts and separate release approval.

PostgreSQL stores business records, audit records, and the outbox. A separately managed dispatcher leases outbox rows and sends Celery tasks through Redis. Workers share the application’s models and domain rules and reconcile outcomes with the approved source system. Company and role checks stay in the API and worker boundaries.

The legacy NestJS API and BullMQ worker remain available for parity and rollback. During an approved handover, a single API owns business writes and a single dispatcher owns the outbox. Read-only checks may run against an isolated copy.

The [Phase 01 foundation](../implementation/phase-01-fastapi-foundation.md) provides the parallel local FastAPI service, two health routes, and the shared settings, authorization, and error handling used by later phases.
