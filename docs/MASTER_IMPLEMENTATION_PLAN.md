# FastAPI master implementation plan

Migrate the existing application in place. Preserve the approved UI, routes, pricing, data, access boundaries, and workflows. Keep the legacy runtime available for parity and rollback. January launch delivery has a separate scope.

| Phase | State | Exit evidence |
| --- | --- | --- |
| 00 Repository audit | Accepted | Legacy API and data inventory, synthetic signatures, database, queue, and browser baseline |
| 01 FastAPI foundation | Accepted | Parallel service, OpenAPI, settings, readiness, and auth tests |
| 02 PostgreSQL and Alembic | Accepted | Fresh install and restored-copy schema and record equivalence |
| 03 API and frontend parity | Accepted | 18-operation differential suite, cross-language vectors, and browser parity |
| 04 Celery and outbox | Accepted | Durable delivery, replay, failure recovery, and queue reconciliation |
| 05 Integration compatibility | In progress, awaiting Odoo inventory and rental setup | Real-product catalogue pilot first, followed by mock parity and approved sandbox evidence |
| 06 GCP staging | Awaiting Phase 05 acceptance | Container checks, worker pool lifecycle, scaling, cost, shutdown, and revision rollback |
| 07 Production readiness | Pending | Single-writer cutover rehearsal, rollback approval, and explicit production authorization |

Read the [phase index](implementation/backend-migration-plan.md), [decision register](DECISIONS.md), and [implementation history](DEVELOPMENT_CHANGELOG.md). Report test outcomes and stop for acceptance at the end of each phase.

Use the [Odoo staging rollout](odoo/plan/implementation-plan.md) to complete the inventory and rental prerequisites for Phase 05.

## Location and delivery workstream

The [LOC implementation plan](implementation/location-serviceability-plan.md) tracks the separately gated PIN, current-location and delivery feature. LOC-00 through LOC-02 were accepted on local evidence on 2026-11-27. LOC-03 adds persistent preferences and PIN-aware catalogue and product availability. LOC-04 through LOC-06 await their respective gates. The live provider smoke and approved postal data remain pending.

The user confirmed on 2026-11-27 that coverage includes all valid PIN codes in Delhi's entire NCT and Gurugram city (Gurgaon). The approved postal source and verified PIN list remain pending; derive the list from that policy after source approval. Existing Noida routes and Odoo preview remain synthetic/local pilot scope. Live stock, payment, identity, production migration and deployment retain their independent release dependencies and approvals.
