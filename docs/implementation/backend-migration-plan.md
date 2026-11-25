# Backend migration plan

Proceed in order and stop at each acceptance gate. The [master plan](../MASTER_IMPLEMENTATION_PLAN.md) records current status.

| Phase | Prerequisite | Changes and verification | Recovery |
| --- | --- | --- | --- |
| [00 Audit](phase-00-baseline.md) | Approved target architecture | Inventory the legacy UI, APIs, schema, workers, and tests. Record synthetic vectors and run isolated baseline checks. | Leave the legacy stack serving and stop test processes. |
| [01 FastAPI foundation](phase-01-fastapi-foundation.md) | Accepted Phase 00 | Add Python package, settings, readiness, auth dependencies, compatibility errors, and HTTPX tests. | Stop FastAPI and leave the legacy proxy target in place. |
| [02 PostgreSQL and Alembic](phase-02-postgresql-alembic.md) | Accepted Phase 01 | Verify fresh setup and isolated restore. Compare all eight tables, IDs, constraints, and migration history. | Keep a verified backup and defer stamping on any mismatch. |
| [03 API and frontend parity](phase-03-api-parity.md) | Accepted Phase 02 | Port and compare all 18 operations, then regenerate TypeScript contracts and verify the UI. | Repoint the proxy and reconcile writes before changing ownership. |
| [04 Celery and outbox](phase-04-celery-outbox.md) | Accepted Phase 03 | Verify leases, retry, idempotency, crash recovery, and BullMQ reconciliation. | Stop the dispatcher and reconcile work before handing ownership back. |
| [05 Integration compatibility](phase-05-integrations.md) | Accepted Phase 04 | Verify mock behavior and approved Odoo, Atlas, PMS, and payment contracts. | Gate unresolved adapters and reconcile uncertain effects. |
| [06 GCP staging](phase-06-gcp-staging.md) | Accepted Phase 05 and approved staging resources | Verify separate images, service authentication, networking, and worker lifecycle and cost. | Revert to compatible revisions and reconcile tasks. |
| [07 Production readiness](phase-07-cutover-readiness.md) | Accepted Phase 06 | Rehearse single-writer cutover and reverse handover. Obtain explicit approvals for production actions. | Pause writes, restore compatible revisions, and reconcile before reopening. |

Append outcomes and changed paths to the [implementation history](../DEVELOPMENT_CHANGELOG.md) at each gate.
