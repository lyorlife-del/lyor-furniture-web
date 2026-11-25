# Phase 04 — Celery and outbox

## Entry

Phase 03 accepted and isolated PostgreSQL and Redis prepared.

## Implementation

Implement dispatch, task processing, retry, and reconciliation in `apps/api/app/workers/`. Wire a distinct Celery queue and independent worker startup. Preserve the transactional outbox and audit history.

## Acceptance and rollback

Prove crash recovery, broker interruption, stale leases, duplicate delivery, retry exhaustion, and audited replay using real Redis. Record a disposition for waiting, active, delayed, retried, and failed BullMQ work before ownership changes.

Ambiguous external outcomes block replay. Stop the new dispatcher and reconcile events before restoring legacy ownership.

Record changed paths and actual commands and outcomes in the [implementation history](../DEVELOPMENT_CHANGELOG.md). Stop for phase acceptance.

## Local runtime and verification commands

Run from `apps/api/` with the Phase 02 local or isolated test database settings. Set `LYOR_REDIS_URL` to the intended loopback Redis broker. Use the mock worker only in local or test demo mode. Operate one authoritative dispatcher for a database.

```powershell
uv sync --locked
uv run --locked python -m app.workers worker
uv run --locked python -m app.workers dispatch
```

Run the worker and dispatcher in separate processes. The worker uses Celery's solo pool for the Windows verification and prefork by default on Linux. The dispatcher supports `--once` for local checks. GCP worker lifecycle and sizing remain Phase 06 work.

From the repository root, use `npm.cmd run build -w @lyor/api` to build the legacy comparison API. Then run `node tests/parity/phase04-worker.mjs` with disposable PostgreSQL on 5433 and Redis on 6383. The Redis container for the test is named `lyor-phase04-redis` and carries `com.lyor.purpose=phase04-worker`. The harness stops and restarts that labelled container to exercise a real broker outage. It creates uniquely named test databases and uses API ports 4142 and 4042 and browser port 3120. Evidence is written under ignored `.data/phase04/`.

## Handover and rollback procedure

1. Stop the legacy dispatcher. Pause BullMQ and allow active work to finish. Record the time, PostgreSQL outbox state, and queue inventory before starting another dispatcher.
2. Run `node scripts/reconcile-bullmq.mjs` with `LYOR_RECONCILE_DB_URL` and `LYOR_RECONCILE_REDIS_URL` set to the isolated test services. Review the result for unmatched work, ambiguous order evidence, pending active work, missing due times, and retry conflicts. The report exits with code 2 while blocked and never writes to either store.
3. Preserve failed and completed records for audit. Agree the disposition for paused and waiting work. For eligible delayed or retrying work, preserve the later available time and the higher attempt count. Apply the reviewed disposition to the outbox in the approved handover. Keep the legacy queue paused and retain its records for rollback.
4. Start Celery only after the sole-dispatcher check and the required approval. To reverse, stop its dispatcher first, drain or account for active tasks, and compare PostgreSQL state before restoring legacy consumption. Review any completed or uncertain work before replay. Production queue ownership remains a separate approval.

## Verification on 2026-11-25

| Check | Result |
| --- | --- |
| Duplicate delivery and reconciliation | Duplicate messages and previously committed demo reservations preserved a single stock decrement and reservation record. |
| Retry exhaustion | Five database-backed attempts followed the configured backoff and recorded a terminal failure. |
| Admin replay | The existing browser action returned HTTP 201, recorded the prior attempts in the audit log, and completed the event after recovery. |
| Redis interruption | The dispatcher recovered an expired lease after Redis restarted. |
| Worker termination | Killing the worker after a stock update rolled back the transaction. A stale delivery could not acquire the renewed lease, and the valid delivery completed. |
| Uncertain external order reference | FastAPI and NestJS both returned HTTP 409 on replay and kept the event for manual reconciliation. |
| BullMQ handover | Inventory covered waiting, active, delayed, retrying, and failed jobs, including database-only failures. Active work blocked handover. The pause-and-drain rehearsal preserved due times, attempt counts, and failed records. |

All seven scenarios passed with disposable PostgreSQL and Redis, the Windows Celery solo pool, and a targeted Playwright browser check. The FastAPI suite passed 35 tests and the legacy NestJS suite passed 15 tests against a separate isolated database. The legacy build and Python lock check passed. The harness saved `worker-results.json`, `bullmq-before-drain.json`, and `bullmq-after-drain.json` under `.data/phase04/`.

The database schema and Alembic history were preserved. The existing replay endpoint now rejects ambiguous orders in both runtimes. The browser sends a JSON body through the existing replay action. Cloud Run lifecycle, scale, cost, and Celery shutdown remain open for Phase 06. Phase 04 awaits acceptance.
