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

## 2026-11-25 — Phase 05 started

- The user authorized continuing past Phase 04 and requested storefront verification of actual Odoo products before the broader adapter work.
- Added the read-only SKU check in `apps/api/app/integrations/odoo_catalog.py` and the mocked transport tests in `apps/api/tests/test_odoo_catalog.py`. The check adds a local CLI command and makes no HTTP route, storefront, or database schema changes. To roll it back, remove the standalone CLI and its tests.
- Python tests returned 39 passed, including all six catalogue checks. Three existing PostgreSQL tests skipped because the isolated test launch did not configure a database. Documentation links passed. The CLI exited with code 1 when Odoo configuration was missing.
- Live verification awaits approved Odoo product access and the furniture SKU and display mappings. See the [Phase 05 catalogue pilot](implementation/phase-05-integrations.md).

## 2026-11-25 — Odoo staging product access verified

- Authenticated JSON-2 product and metadata reads returned HTTP 200. Local pilot SKUs returned zero matches. Five sampled furniture variants had image data, empty Internal References, and disabled rental and publication flags. A rental-enabled sample also returned records.
- Product selection and the approved rental rate, Noida availability, and publication mappings remain open. This step updated documentation and wrote no Odoo or PostgreSQL business data. See the [Phase 05 catalogue evidence](implementation/phase-05-integrations.md).

## 2026-11-25 — Phase 05 display-only preview verified

- Added variant-ID reads to `apps/api/app/integrations/odoo_catalog.py` and a guarded projection command in `apps/api/app/integrations/odoo_preview.py`. Tests are in `apps/api/tests/test_odoo_catalog.py` and `apps/api/tests/test_odoo_preview.py`. The preview writes only to a disposable, explicitly named PostgreSQL database. The API routes, database schema, and frontend source are preserved.
- Verified all five requested IDs against live staging, passed 45 Python tests with disposable PostgreSQL, and passed the Playwright storefront check using a synthetic listing. The browser displayed the expected image and monthly rate, opened the product details, and disabled the cart action.
- Rollback is stopping the isolated preview and discarding its database. The live catalogue pilot still requires approved product selection and rate, image, and Noida availability mappings. Phase 05 remains in progress.

## 2026-11-25 — User-selected Odoo templates resolved

- Authenticated staging reads confirmed that action 2967 opens product templates. Resolved the five supplied IDs to ten active variants. One template has six finish and size combinations.
- Staged and decoded five WebP template photos in ignored `.data/phase05-odoo-assets/`. Recorded the mapping and pending rate and location fields in the local selection file. No application, schema, or operational data changes were made. Rollback is discarding the staged local assets.
- The five templates have no configured rental rules. The warehouse-name search returned no Noida match. Confirm rates and serviceable location, and select the table variants. See the [Phase 05 product mapping](implementation/phase-05-integrations.md).

## 2026-11-25 — Odoo staging plan drafted

- Added the [Odoo documentation index](odoo/README.md), area architecture, staged implementation checklist, setup runbooks and operational flows under `docs/odoo/`. Linked them from the architecture, marketplace master plan and Phase 05 record.
- Recorded owner decisions, prerequisites, verification and rollback for product setup, physical inventory, rentals and marketplace handoff. The documentation step changes no application code, API contract, database schema or Odoo data.
- `npm.cmd run docs:check` passed for 189 Markdown documents. `git diff --check` passed. Odoo configuration and storefront acceptance tests remain part of the staging rollout.
- Phase 05 remains open while staging inventory and rental setup are pending. Phase 06 waits for Phase 05 acceptance.

## 2026-11-27 — Figma homepage integrated

- Implemented the supplied Figma homepage on `/` with the LYOR brand, local design assets, responsive navigation, lifestyle carousel, rental preferences, catalogue cards, wishlist and FAQ. The homepage keeps the existing LYOR catalogue and product links. Sample reviews are labelled, and appliances without mapped products link to catalogue searches.
- Pass the selected rental tenure to the existing product page. Reuse serviceability, session, cart and pricing logic. Wishlist selections are stored on the current device. No backend API, database, external integration or phase-gate changes were made.
- Updated the homepage Playwright scenario for the reference layout and its interactive flows. Roll back by reverting the homepage, its header variant and assets, the tenure handoff and the matching browser assertions.
- Workspace build, lint, type checks, unit tests and documentation checks passed. The isolated database suite passed all 15 API tests. All 11 browser tests passed on isolated PostgreSQL, including the mobile layout, image loading, catalogue search, tenure handoff, saved cart and demo checkout.

## 2026-11-27 — Figma design system extended across the marketplace

- Shared the homepage header, footer, wishlist, location dialog and visual tokens across the existing routes. Updated the catalogue, product gallery, bundles, cart, checkout, customer dashboard and staff screens. The same theme applies to business enquiries, policies and route recovery screens.
- Kept the current API and database contracts. Catalogue tenure travels in the web URL and does not change the API query. A cart edit refreshes the quote flow. Checkout shows the signed quote breakdown and an owner-scoped demo receipt without implying completed payment or delivery.
- The builds, lint, type checks, unit and database tests, OpenAPI regeneration and documentation checks passed. All 13 Playwright tests passed against each API runtime on isolated PostgreSQL databases. Catalogue, product and bundle previews loaded their images without horizontal overflow at 1440 px and 375 px.
- Live payment verification, delivery slots, production identity, custom bundles and additional catalogue facets remain contract dependencies. Revert the shared shell, theme and affected frontend routes and their assertions to roll back. See the [storefront design system](architecture/storefront-design-system.md).

## 2026-11-27 — LOC-00 audit and architecture prepared

- Audited the existing header dialog, persisted PIN/cart/quote state, FastAPI serviceability/catalogue/pricing/order routes, eight SQLAlchemy tables, Alembic baseline, demo authentication, Redis/Celery workers, Figma checkout reference, environment examples and cloud/CI files. Preserved the user's staged storefront changes.
- Added location HLD/LLD, provider and database design under `docs/architecture/`, four operational flows under `docs/flows/`, and the [LOC phase plan and evidence](implementation/location-serviceability-plan.md). Appended the master plan and decision register; migration Phase 05 remains open. No application, API, schema, business-record, external-system or deployment changes were made.
- Recorded the user's confirmed policy covering all valid PIN codes in Delhi's entire NCT and Gurugram city. The postal source and verified PIN list remain pending; derive coverage after source approval. Documented separate postal validity, configured eligibility, capacity, stock, payment and confirmation states, plus versioned quote/request compatibility and external reconciliation.
- Baseline lint, type checks, unit tests, isolated database tests (15 API tests), contract generation and builds passed; restricted database/build/contract attempts required approved unrestricted reruns. Python returned 41 passed and 4 database-dependent skips. All 13 Playwright tests passed against FastAPI on a fresh isolated database and an ignored web-source copy; the user's existing dev server was preserved. Documentation checks passed for 199 Markdown documents and whitespace checks passed. Generated contracts have no diff. See the phase plan for commands, environmental failures and existing warnings. No live geocoding, stock/payment, GCP or performance verification is claimed.
- Rollback removes only LOC-00 documentation additions/appended records. LOC-00 awaits user acceptance before LOC-01 implementation; all production and worker-cutover approvals remain separate.

## 2026-11-27 — LOC-00 accepted; LOC-01 implementation started

The user accepted LOC-00 and authorized manual PIN validation. Added the FastAPI manual-check/error routes, database-backed eligibility service, reviewed offline reference importer, synthetic postal fixture, eight additive Core tables and frozen Alembic revision. Added the opt-in existing-dialog integration with confirmation, stale-request cancellation, PIN/city persistence and quote invalidation while preserving cart contents. Generated only additive FastAPI contracts; the legacy contract, pricing, checkout and workers remain unchanged. Architecture, flows, decisions and verification are tracked in the [LOC plan](implementation/location-serviceability-plan.md).

Initial isolated verification passed 66 Python tests with no skips, including migration/restore and concurrent configuration checks, and all 13 existing browser journeys. Four new browser assertions needed correction for hidden-background access and cart-save timing; final outcomes are recorded at the LOC-01 gate. No live postal source, external integration, production zone, database, worker cutover or deployment was enabled. Production actions retain separate approvals.

## 2026-11-27 — LOC-01 technical evidence complete

- Database-backed manual checks and opt-in PIN confirmation are verified. Added immutable reviewed-source staging, audited configuration activation, effective-date and company boundaries, fail-closed source errors, and safe empty-only downgrade. The new Alembic revision preserves the eight original tables, all original records in restored copies and Prisma history. The feature remains disabled by default; no approved live postal source or verified list exists yet.
- Final isolated Python run passed 67 tests without skips, including failed-activation rollback and concurrent configuration changes. All 13 existing browser tests passed, and all five new feature scenarios passed, including desktop/tablet/mobile, stale responses and cart/tenure retention. The tablet test found and verified a fix for 10 pixels of existing navigation overflow; the existing scroll behavior now covers tablet widths. Initial test assertion/timing failures and the intermediate overflow failure are retained in the phase record.
- Required lint, type checks, unit tests, 15-test isolated database suite, legacy contracts, additive FastAPI contracts, build and documentation checks passed. Original generated legacy contracts have no diff. Restricted-account write failures required approved unrestricted runs; existing Vite/Next.js image warnings remain recorded. Temporary services stopped and generated route-type changes were restored. No live geocoding, slot, stock, payment, load, GCP or deployment verification is claimed.
- Source and operational changes are under `apps/api/app/services/`, `apps/api/app/db/serviceability.py`, `apps/api/app/api/v1/serviceability.py`, additive Alembic files, the opt-in web dialog/store/header, candidate contract tooling, focused tests and [location records](implementation/location-serviceability-plan.md). Application rollback disables the flags and retains populated additive tables/audits; live source activation, production changes and worker cutover keep their own approval boundaries. LOC-01 awaits user acceptance before LOC-02.

## 2026-11-27 — LOC-01 accepted and LOC-02 locally verified

Added opt-in current-location detection with manual fallback, explicit confirmation and a typed FastAPI resolver. The Google adapter requires explicit live configuration and shared Redis limits. The isolated rehearsal passed 98 Python tests, 13 baseline browser journeys and 10 location journeys. The separate legacy database suite passed 15 tests. Redis concurrency and quota recovery passed using a temporary local container. Build, lint, type checks, unit suites, contracts and the offline dependency lock passed. Provider transport used synthetic responses. The approved live smoke and postal source remain pending. LOC-02 awaits acceptance. See the [phase evidence and rollback instructions](implementation/location-serviceability-plan.md#loc-02-current-location--2026-11-27).

## 2026-11-27 — LOC-02 accepted and LOC-03 locally verified

Added an opt-in PIN-aware catalogue and detail view, server-backed guest and customer preferences with revision checks, cross-tab refresh, and availability warnings for retained cart items. Alembic adds one preference table. All 100 isolated Python tests, 15 legacy DB tests, 13 baseline browser journeys and 11 location journeys passed. Build, lint, type checks, unit tests and regenerated contracts passed. The rehearsal uses fictional product assignments. Live postal data, stock and rates remain pending. LOC-03 awaits acceptance before cart and checkout work. See the [phase evidence and rollback instructions](implementation/location-serviceability-plan.md#loc-03-catalogue--2026-11-27).
