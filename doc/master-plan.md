# LYOR Furniture Marketplace — implementation master plan

## Approved baseline

Next.js/React/TypeScript; NestJS/Node.js LTS with Fastify; DTO/class-validator; PostgreSQL/Prisma/Prisma Migrate; Redis/BullMQ; NestJS OpenAPI and generated TypeScript contracts; managed OIDC for production. Tailwind/shadcn-style Radix primitives, GCS, Vercel and Cloud Run remain the target architecture.

## Delivery strategy

1. PH-00: create all phase/flow/step documentation before tracking implementation.
2. PH-01–03: implement a local, synthetic Noida demo with fake customer identities and a mock ERP.
3. PH-04: verify actual external methods/permissions and choose physical-unit tracking before enabling live commerce.
4. PH-05–06: operational lifecycle, stakeholder policy approval and controlled production launch.
5. PH-07: separately approved expansion capabilities.

## Current implementation boundary

The working tree contains a first P0 implementation. It supports catalog/search/sort/pagination, single-city PIN serviceability, product configuration, fixed bundles, database-backed cart, owned signed quote, idempotent checkout intention/outbox, mock reservation, customer status tracks, multi-site enquiry, publication controls and exception replay. The worker uses Redis/BullMQ separately.

Incomplete scope is explicit: rental start-date/slot modeling, a second configurable variant per product, guest-to-existing-account cart merge, full CMS editing/media upload/dual review, mock CRM handoff, and live integrations are not implemented. The local seed supplies one standard variant per product. No paid optional services are added.

## Status semantics

Planned → Ready → In progress → Verification → Done; Blocked records the exact dependency. Code present does not equal Done. Step records link the verification record; deferred behavior remains Planned even where a related UI exists.

## Dependencies and gates

Foundation precedes all APIs. Product/serviceability/pricing precede cart checkout. Identity precedes owned quotes; quotes precede order intentions; outbox precedes mock worker processing. Live integrations require PH-04 contracts. Payment/return/QC workflows require PH-05 decisions. No automatic live booking before atomic reservation is verified.

## Ownership

Odoo owns SKU eligibility, stock, orders and accounting; LYOR owns presentation, carts, quotes, sessions and projections; Atlas owns operational work and evidence; PMS owns site/property/room assignment references. The demo DB's stock is synthetic mock ERP state only.

## Exit evidence

See [verification](verification.md). A full PH-03 exit additionally requires actual Redis/BullMQ crash/recovery evidence, not only direct mock-adapter integration tests.
