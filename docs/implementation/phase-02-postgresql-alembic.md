# Phase 02 — PostgreSQL and Alembic

## Entry

Phase 01 accepted and the legacy table, column, and relationship inventory reviewed.

## Implementation

Implement async SQLAlchemy mappings in `apps/api/app/db/`, the initial revision and environment in `apps/api/alembic/`, and Python fixture/import commands. Preserve mapped names, types, managed defaults, IDs, and legacy history.

## Acceptance and rollback

Apply the initial revision to an empty disposable database. Compare its PostgreSQL metadata against an isolated legacy copy. Verify all eight tables, populated rows, relationship targets, and history in a restore test. Rehearse an equivalence-checked stamp.

A mismatch blocks stamping. Keep the legacy runtime and its migration history and restore only from a verified backup under the approved procedure.

Record changed paths and actual commands and outcomes in the [implementation history](../DEVELOPMENT_CHANGELOG.md). Stop for phase acceptance.

## Local operator commands

Run from `apps/api/`. Set the Phase 01 `LYOR_*` environment variables and point `LYOR_DATABASE_URL` at the intended local target. Local tooling accepts the existing development database tuple `lyor@127.0.0.1:5432/lyor` or a disposable test database `lyor_test@127.0.0.1:5433/lyor_test_…` in test mode. Supply the password through the environment and use a URL without query parameters.

For a fresh disposable database:

```powershell
uv sync --locked
uv run --locked alembic upgrade head
uv run --locked alembic check
uv run --locked python -m app.db.fixtures seed-demo
uv run --locked python -m app.db.fixtures import-pilot
```

To rehearse adoption, take a custom-format `pg_dump` of the isolated legacy source and restore it with `pg_restore --exit-on-error --single-transaction` to an empty test database. Compare IDs, row contents, schema, and Prisma history before pointing the environment at the restored copy. Then run:

```powershell
uv run --locked alembic stamp 0001_legacy
uv run --locked alembic current
```

The stamp validates columns, defaults, named constraints and index definitions, and the applied Prisma migration checksum. Keep the verified backup and stop competing DDL while taking the snapshot and stamping. The initial revision disables destructive downgrade and history purge. The rollback procedure retains the compatible schema, routes the application back to the legacy runtime, and uses the verified restore only if data recovery is needed.

The optional Python database tests require `LYOR_PHASE02_TEST_DATABASE_URL` pointing at a fresh, migrated disposable database. They roll back fixture writes at the end of each test.

## Verification on 25 November 2026

| Check | Actual result |
| --- | --- |
| Fresh install | `uv run --locked --offline alembic upgrade head` succeeded on an empty PostgreSQL 17 database. Its catalogue matched the legacy Prisma database across eight tables, 87 columns, 13 named primary and foreign key constraints, and 16 indexes. `alembic check` reported no new upgrade operations. |
| Backup and restore | `pg_dump --format=custom` and `pg_restore --exit-on-error --single-transaction` succeeded on isolated databases. Full-row digests and counts matched for 89 products, one synthetic row in each other domain table, and the original Prisma migration history row. The comparison includes IDs, relationships, timestamps, JSONB payloads, and a demo external order reference. |
| Guarded adoption | `alembic stamp 0001_legacy` added the version marker to the restored copy, and `alembic current` showed `0001_legacy (head)`. The same domain catalogue and row digests passed after stamping. `alembic check` passed on the stamped copy. |
| Rejection paths | Schema drift, missing Prisma history, and a changed checksum all prevented stamping. The failed schema and checksum tests rolled back before leaving a version marker. History purge and destructive downgrade also failed as intended. |
| Tests and fixture data | All 29 pytest tests passed against the fresh database. The CLI loaded 10 demo products and all 79 pilot entries. Tests covered rerunning the loaders, preserving stock and publication, transaction rollback on a foreign SKU, scope guards, and ORM-generated IDs, timestamps, and relationships. |
| Repository checks | The uv lock check, documentation link check, and whitespace check passed. The original Prisma migration SQL and the frozen Alembic SQL had identical SHA-256 hashes. |

The backup, recovery harness output, and detailed test evidence are retained locally under ignored `.data/phase02-*` paths. The rehearsal used synthetic fixtures only. Phase 02 was accepted on 25 November 2026. Phase 03 covers the 18 business and health operations, cross-language signing and idempotency, and browser parity.
