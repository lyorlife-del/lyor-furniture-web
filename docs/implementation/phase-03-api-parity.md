# Phase 03 — API and frontend parity

## Entry

Phase 02 accepted and legacy API and browser fixtures available.

## Implementation

Port the 18 operations in `apps/api/app/api/v1/` and the corresponding domain services. Preserve the Next.js BFF session endpoint. Change only compatibility entry points under `apps/web/` and publish generated contracts in `packages/api-contracts/` after differential tests pass.

## Acceptance and rollback

Compare schemas, statuses, validation, authentication, revision/ownership behavior, public response fields, and side effects on isolated copies. Test cross-language canonical bytes, quote signatures and request hashes in both directions. Run Playwright across the reference workflows and compare desktop and mobile screenshots.

Shape drift and duplicate orders block the proxy change. Use the legacy proxy target and reconcile writes before ownership changes.

Record changed paths and actual commands and outcomes in the [implementation history](../DEVELOPMENT_CHANGELOG.md). Stop for phase acceptance.

## Changes under review

The [FastAPI routers](../../apps/api/app/api/v1) serve the 18 existing operations using SQLAlchemy. The quote and checkout code uses the legacy canonical JSON ordering, timestamps, integer-paise calculations, HMAC signatures, and SHA-256 request hashes. Cart revision and order idempotency checks are transactional. Order creation writes its pending outbox event and audit entry in the same transaction. Staff publication and replay keep the legacy role checks and audit details.

The [FastAPI OpenAPI document](../../packages/api-contracts/fastapi-openapi.json) and [TypeScript declarations](../../packages/api-contracts/src/fastapi-schema.d.ts) are available through the candidate contract. The default frontend contract and API target still refer to the legacy runtime. A local Next.js preview can point at FastAPI using its existing `API_URL` setting.

## Reproduce locally

1. Prepare the locked Python environment from `apps/api/`. Run `npm.cmd run build -w @lyor/api` from the repository root to build the legacy comparison service.
2. Start a disposable PostgreSQL 17 instance on `127.0.0.1:5433` with the Phase 02 test user `lyor_test` and test-only password `local_test_only`. The harness creates uniquely named `lyor_test_phase03_*` databases for each use.
3. Run `node tests/parity/phase03-preview.mjs` from the root. It clones one migrated synthetic source, then starts the two APIs and shared Next.js preview at `127.0.0.1:3120`. The manifest and logs are stored in `.data/phase03/`.
4. Run `node tests/parity/phase03-api.mjs` and `node tests/parity/phase03-snapshots.mjs` before the browser journeys. Run `npm.cmd run test:e2e` with `PREVIEW_URL=http://127.0.0.1:3120` once for each backend, setting `.data/phase03/preview-backend.txt` to `legacy` or `candidate` between runs.
5. Stop the preview with Ctrl+C or by creating the `.data/phase03/stop` marker. Remove the disposable database container when the evidence has been recorded.

Run PowerShell and Chrome locally as in the existing browser tests. The screenshot comparison uses the same Next.js process, origin, and source files for each backend to control for differences in development CSS generation and rendering.

## Verification on 25 November 2026

| Check | Actual result |
| --- | --- |
| API | `node tests/parity/phase03-api.mjs` passed 55 probes across all 18 operations and 13 additional malformed-input comparisons on separate PostgreSQL clones. It compared full response bodies and normalized generated IDs, digests, and timestamps. It also compared persisted audit actions and details. |
| Cross-runtime checkout | NestJS-issued quotes were checked out by FastAPI and FastAPI-issued quotes were checked out by NestJS on an isolated handoff database. Each issuing runtime replayed the same order by idempotency key. Six simultaneous FastAPI submissions produced one order ID, one outbox event, and one audit entry for that order. |
| Python tests | All 35 pytest tests passed with the isolated PostgreSQL database enabled. The tests include the original Node canonical JSON, signature, and request-hash vectors. |
| Contracts | The published FastAPI OpenAPI matched the checked-in candidate. All 18 method/path pairs, operation IDs, and success statuses matched the legacy specification. `openapi-typescript` generated the separate TypeScript declarations. |
| Browser journeys | All 11 Playwright tests passed for each backend against the shared Next.js preview. |
| Visual comparison | All 22 screenshot pairs were pixel-identical at 1440×900 and 390×844. Coverage includes home, Rent, Buy, product, bundles, business, policies, orders, cart, checkout recovery, and admin. The comparator waits for the same UI states, hides the development overlay, and uses the same Next.js process for both captures. |
| Static checks | Legacy API build, lint, TypeScript, documentation links, and whitespace checks passed. |

REA confirmed navigation from home to rental catalogue to product and the signed-in account and cart journey on each backend.

| Browser replay | NestJS evidence | FastAPI evidence |
| --- | --- | --- |
| Desktop discovery | `ev_a138c5ce80bc108bc51b68f656e40afd3e35bfaddee1135cfbb30e581f1026fc` | `ev_677a33d3542f868cf6f5bd5c3166a68460dffff67d2e5d83540fc930507f0bbb` |
| Mobile account and cart | `ev_67e59f3b30a3b3212e00db2919c486361cd66dd351c0c318ab7031540b7c1c1a` | `ev_6b340b0c02658eacf03d46cc96be72b0dd5cac22a8e3c0e9be1f87a33453f585` |

The existing browser proxy sends a JSON content type with an empty body for admin replay. Both stacks returned the same 400 in that browser-proxy check. The direct admin replay API passed and wrote its audit entry.

[Phase 04](phase-04-celery-outbox.md) updates the admin replay request to send an empty JSON object and checks the existing dashboard action.

All runs used synthetic data and localhost-only previews. Phase 03 was accepted on 25 November 2026. Phase 04 covers worker delivery, idempotency, and queue reconciliation.
