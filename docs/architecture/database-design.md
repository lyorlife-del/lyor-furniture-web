# PostgreSQL and Alembic design

Map `Product`, `Cart`, `Quote`, `OrderIntent`, `OutboxEvent`, `Reservation`, `BusinessEnquiry`, and `AuditLog` to the deployed legacy schema. Preserve quoted identifiers, column types including JSONB and arrays, nullability, defaults, unique constraints, foreign keys and their actions, and timestamps. Replicate application-generated IDs and update timestamps where the legacy database has no server default.

Retain [legacy Prisma migration SQL](../../apps/api/prisma/migrations/202611230001_initial/migration.sql) and the database migration history. Compare SQLAlchemy metadata and Alembic’s initial revision against a schema-only dump and restored data in an isolated database. Check table counts and representative IDs, foreign-key relationships, JSON values, and audit history. Document a fresh install path and an equivalence-checked stamp for existing databases. A schema mismatch blocks the stamp.

Before any separately approved live migration, verify the backup and restoration procedure and record the recovery point. Roll back application routing with the compatible schema intact during the rollback window. Pause writes and reconcile before any data restore.

## Phase 02 mapping

The [SQLAlchemy models](../../apps/api/app/db/models.py) preserve the legacy PostgreSQL table and column names. Python attributes use snake case. JSONB, text arrays, native nullability, and timestamp precision match the legacy DDL. PostgreSQL permits null cities in existing product rows. Reads in the parity phase must check how the Prisma service presents those rows. The models provide the text UUIDs and UTC update timestamps that Prisma previously supplied through the application.

The initial Alembic revision uses a [frozen copy of the legacy DDL](../../apps/api/alembic/versions/0001_legacy.sql) for empty databases. The adoption stamp compares the live PostgreSQL catalogue to the [frozen schema](../../apps/api/alembic/versions/0001_legacy_schema.json) and checks the applied Prisma migration and checksum. The checks and version write share a transaction. Both migration histories remain in place. An existing database takes the stamp path after verification. See [Phase 02](../implementation/phase-02-postgresql-alembic.md) for commands and evidence.

## LOC-01 additive reference data

LOC-01 adds eight independently mapped Core tables through frozen Alembic revision `0002_location_reference`, without changing the eight original tables or the legacy migration histories. Alembic metadata includes both sets; compatibility tests compare the unchanged legacy subset plus the explicit new table set on fresh and restored isolated databases. New postal and delivery configuration defaults to disabled, and populated downgrade is blocked to preserve reference and audit history. See [serviceability database design](serviceability-database.md) and [LOC-01 evidence](../implementation/location-serviceability-plan.md#loc-01-implementation-record).
