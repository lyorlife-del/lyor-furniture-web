# Plan change log

## 2026-11-23 — Storefront readiness

- Streamed home and catalog content and added product loading and recovery states.
- Bootstrapped the account header from the demo session cookie. Added a signed-in account menu and request cancellation on orders and checkout.
- Preserved cart and PIN state through browser navigation and recoverable outages. Added product summaries to cart responses and invalidated stale quotes.
- Recorded the [REA replay and matched browser timings](evidence/storefront-readiness.md). Updated the affected flow steps, phase acceptance records, and API contract.

## 2026-11-23 — Initial implementation

- Established root `doc/` with 8 phases, 20 flow plans and a separate document for every planned step.
- Implemented the local Next.js and NestJS/Fastify P0 baseline; retained future/live capabilities as explicit gates.
- Added synthetic Noida fixtures, persisted cart, signed quotes, owned idempotent order intentions/outbox, direct mock reservation and BullMQ worker.
- Added multi-site local enquiries, staff publication and audited replay.
- Added optional project-local PostgreSQL to permit isolated Windows tests without an available Docker daemon. This does not change the production stack.
- Restricted demo authentication and adapters to local development/test. No external order, payment, message or deployment is enabled.
- Exact validation outcomes live in `verification.md`; phase and step status must not imply tests that were not run.
