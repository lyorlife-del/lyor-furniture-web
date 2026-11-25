# Phase 00 — Legacy baseline

Reference commit `fb7d266` on `branch/sumit`. This phase records evidence before FastAPI application changes. The original LYOR FastAPI stack adaptation and architecture SOP were both available during planning. This migration uses their domain boundaries and Python design. The latest approval sets GCP as the deployment target.

## Baseline inventory

- Next.js routes cover home, rent and buy catalogues, product detail, bundles, cart, checkout, order history, business enquiry, staff, and policies. The same-origin BFF owns the demo identity cookie and forwards API requests.
- The [API compatibility matrix](api-compatibility.md) records all 18 API operations. Legacy roles are guest, customer, catalogue manager, and administrator. Customer orders and claimed carts are owner scoped.
- Prisma manages eight domain tables and a separate migration-history table. The legacy worker takes order events from the outbox and uses a database-backed Odoo demo adapter. Live identity, payments, Odoo, Atlas, and PMS remain separate gates.
- Tooling includes a legacy API Dockerfile, local PostgreSQL and Redis in Compose, GitHub Actions, Jest, Vitest, and Playwright. Live hosting and payment setup require independent owner verification.

## Verification on 25 November 2026

The baseline used synthetic data and localhost-only resources. The NestJS API used port 4120, Next.js used 3120, embedded PostgreSQL used 5433, and a disposable Redis 7 container used 6383.

| Check | Actual result |
| --- | --- |
| Legacy API | 31 HTTP probes passed across all 18 operations. Probes covered the response fields, error envelope, denial and ownership, stale cart revision, duplicate order, and audited replay. [Observed results](fixtures/legacy-api-probes.json) |
| Node signing fixture | Verified canonical quote and order request bytes, SHA-256 request hash, HMAC quote signature, and tamper rejection against the baseline source. [Portable fixture](fixtures/legacy-signing.json) |
| PostgreSQL and Jest | All 15 API tests passed, including seven PostgreSQL integration tests on an isolated clone. The migration and seed created the original demo catalog and 79 pilot listings in the source fixture. Independent browser and integration clones matched the seeded source. |
| Populated PostgreSQL clone | After the workflows, a second clone matched row digests, column metadata, PostgreSQL constraint catalogue entries, and indexes for all eight populated domain tables and migration history. Counts were 6 audit rows, 2 enquiries, 6 carts, 2 orders, 2 outbox rows, 89 products, 5 quotes, 2 reservations, and 1 migration history row. The comparison included 95 column rows, 99 constraint rows, and 17 indexes. |
| BullMQ and real Redis | Observed waiting, active, delayed, retry-pending, and terminal failed jobs in a separate test queue. The legacy worker completed a replayed order outbox event and generated one reservation. Re-delivery left the same single reservation. |
| Playwright | All 11 journeys passed against the isolated preview. Captured 22 screenshots across 1440×900 and 390×844, covering home, Rent, Buy, product, bundles, business, policies, orders, cart, checkout, and admin. The local manifest is `.data/phase00-browser/manifest.json`. |
| REA desktop | Home → rental catalogue → product completed. Evidence ID `ev_a2199b67fa281418e59cefe868b7524154cdb38736faf169bffc643f44947926`. |
| REA mobile | Demo sign-in → account menu → orders → cart → account menu completed. Evidence ID `ev_02572b072c8c57662f128d14a9b4eecd0f4b33735bc5ccaea33f4d8e9d14310b`. |
| Build, lint, and type checks | The legacy API build, Next.js production build, lint, and TypeScript checks passed. Both frontend component tests passed. |
| Documentation | The link checker passed across 177 Markdown files, including the 109 historical step documents. |

Commands for the reusable checks include `npm.cmd run build -w @lyor/api`, the Jest integration suite with `RUN_DB_TESTS=true` against the isolated clone, and `npm.cmd run test:e2e` with `PREVIEW_URL=http://127.0.0.1:3120`. Supplemental probe and screenshot scripts and raw evidence are retained locally under ignored `.data/phase00-*` paths. No private production data was used.

## Gate

Phase 00 was accepted on 25 November 2026. Python signatures and differential testing, Alembic equivalence, Celery parity, and GCP worker-pool lifecycle and cost belong to their later phase gates.

Rollback of the documentation change uses the reference commit. The disposable preview and Redis container were stopped after the checks. The legacy API, application schema, migration SQL, and browser source are unchanged.
