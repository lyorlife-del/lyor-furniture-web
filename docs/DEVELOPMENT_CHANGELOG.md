# Migration implementation history

Add a dated entry after every completed phase. Include changed paths, API and database impact, tests actually run, unresolved issues, rollback, and the acceptance status.

See the [historical change log](../doc/change-log.md) for earlier implementation history.

## 2026-11-25 — Phase 00 evidence complete

- Added the root `docs/` architecture, phase plans, decisions, API compatibility matrix, and synthetic reference fixtures. Updated `README.md`, `AGENTS.md`, and `scripts/check-docs.mjs` for the migration docs and phase gates.
- Public API, frontend, schema, and historical SQL migrations were unchanged. The PostgreSQL migration was exercised on an isolated source fixture before creating test clones.
- Verified 31 HTTP probes across 18 operations, 15 API tests, two frontend component tests, 11 Playwright journeys, 22 screenshots, two REA traces, populated database-copy equivalence, and actual legacy BullMQ delivery and deduplication. Build, lint, TypeScript, and documentation link checks passed.
- Phase 00 is awaiting acceptance. Python cross-runtime tests, Celery processing, and hosted worker-pool verification are later gates. Rollback of the documentation change uses the baseline commit. See the [Phase 00 record](implementation/phase-00-baseline.md).

## 2026-11-25 — Phase 00 accepted

The user accepted the Phase 00 verification and authorized the Phase 01 foundation. The next acceptance gate is Phase 01. Production actions still require separate approval.

## 2026-11-25 — Phase 01 evidence complete

- Added the Python 3.12 project, uv lockfile, FastAPI application, settings, demo identity and role dependencies, error handlers, and tests under `apps/api/`. Added Python cache and environment ignores.
- Published a candidate OpenAPI document for liveness and readiness. The legacy API, browser proxy, and generated frontend contract continue serving the marketplace. PostgreSQL was used for a read-only readiness probe. Schema and data migration work remains Phase 02.
- All 22 pytest and HTTPX tests passed. Live NestJS and FastAPI comparisons matched before and during an isolated PostgreSQL outage. The documented selector loop fixed readiness on Windows. Repository lint, documentation links, and whitespace checks passed.
- Stopped the temporary verification processes. Rollback is to omit the parallel Python service. See the [Phase 01 gate](implementation/phase-01-fastapi-foundation.md) for the remaining work and acceptance status.

## 2026-11-25 — Phase 01 accepted

The user accepted the FastAPI foundation and authorized Phase 02. The next gate covers database mapping, Alembic, and isolated restore verification.

## 2026-11-25 — Phase 02 evidence complete

- Added PostgreSQL models, local-target checks, and Python catalogue tools under `apps/api/app/db/`. Added the Alembic environment, frozen baseline DDL and schema evidence, tests, and updated the Python dependency lock.
- The legacy frontend, API, worker, and Prisma migration are still the active reference. The fresh Alembic revision reproduced the legacy schema. The guarded stamp recorded the equivalent baseline on an isolated restore while preserving the original schema and rows.
- Verified 29 Python tests, fresh and restored PostgreSQL catalogue equivalence, backup and data restore, fixture idempotency, and rejection of schema drift, bad history, purge, and destructive downgrade.
- Phase 02 awaits acceptance. Rollback retains the compatible legacy schema and uses the verified backup for data recovery if required. See the [Phase 02 verification](implementation/phase-02-postgresql-alembic.md).

## 2026-11-25 — Phase 02 accepted

The user accepted the PostgreSQL and Alembic verification and authorized Phase 03. The next gate covers API, signing, and storefront parity.

## 2026-11-25 — Phase 03 evidence complete

- Added FastAPI catalogue, serviceability, cart, quote, order, enquiry, and staff routes in `apps/api/app/api/v1/`. Added legacy HTTP handling, Python and differential tests, and a separate generated candidate contract in `packages/api-contracts/`.
- The 18 legacy routes were reproduced without changing the PostgreSQL schema or frontend source. The default frontend target remains the legacy API. Order creation preserves the transactional outbox and audit write.
- Passed 68 differential HTTP probes and validation comparisons, two cross-runtime quote and order handoffs, duplicate-submit checks, 35 Python tests, 11 Playwright tests per backend, and 22 pixel-identical screenshot pairs. REA completed four browser replays. The existing browser-proxy replay limitation is recorded in the phase report.
- Phase 03 awaits acceptance. Rollback for preview users is pointing the existing API URL back at NestJS. See [Phase 03 verification](implementation/phase-03-api-parity.md).

## 2026-11-25 — Phase 03 accepted

The user accepted API and storefront parity and authorized Phase 04 worker migration and isolated queue recovery checks.

## 2026-11-25 — Phase 04 evidence complete

- Added the Celery worker and PostgreSQL lease dispatcher under `apps/api/app/workers/` and updated `apps/api/pyproject.toml` and `apps/api/uv.lock`. Reused rental demand calculations in `apps/api/app/api/v1/pricing.py`. Reservation, audit, and outbox completion commit together.
- Guarded unsafe replay in `apps/api/app/api/v1/staff.py` and `apps/api/src/modules/admin/module.ts`. Updated the request body in `apps/web/src/app/admin/page.tsx` for the existing admin recovery action. The existing replay route now returns HTTP 409 when an order reference requires manual reconciliation. PostgreSQL schema and migration history were preserved.
- Added the read-only BullMQ inventory in `scripts/reconcile-bullmq.mjs` and the rehearsal in `tests/parity/phase04-worker.mjs`. All seven worker scenarios passed, including real Redis interruption, worker crash and rollback, browser replay, and paused-queue handover. The FastAPI suite passed 35 tests and the legacy NestJS suite passed 15 tests. The legacy build and Python lock check passed.
- Phase 04 awaits acceptance. Rollback starts by stopping the Celery dispatcher and accounting for active deliveries against the PostgreSQL outbox before restoring BullMQ consumption. Production cutover and cloud worker validation remain pending. See the [Phase 04 verification and rollback procedure](implementation/phase-04-celery-outbox.md).
