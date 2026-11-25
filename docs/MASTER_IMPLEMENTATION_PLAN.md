# FastAPI master implementation plan

Migrate the existing application in place. Preserve the approved UI, routes, pricing, data, access boundaries, and workflows. Keep the legacy runtime available for parity and rollback. January launch delivery has a separate scope.

| Phase | State | Exit evidence |
| --- | --- | --- |
| 00 Repository audit | Accepted | Legacy API and data inventory, synthetic signatures, database, queue, and browser baseline |
| 01 FastAPI foundation | Accepted | Parallel service, OpenAPI, settings, readiness, and auth tests |
| 02 PostgreSQL and Alembic | Accepted | Fresh install and restored-copy schema and record equivalence |
| 03 API and frontend parity | Accepted | 18-operation differential suite, cross-language vectors, and browser parity |
| 04 Celery and outbox | Evidence complete, awaiting acceptance | Durable delivery, replay, failure recovery, and queue reconciliation |
| 05 Integration compatibility | Awaiting Phase 04 acceptance | Mock parity and approved sandbox evidence for applicable adapters |
| 06 GCP staging | Pending | Container checks, worker pool lifecycle, scaling, cost, shutdown, and revision rollback |
| 07 Production readiness | Pending | Single-writer cutover rehearsal, rollback approval, and explicit production authorization |

Read the [phase index](implementation/backend-migration-plan.md), [decision register](DECISIONS.md), and [implementation history](DEVELOPMENT_CHANGELOG.md). Report test outcomes and stop for acceptance at the end of each phase.
