import hashlib
import json
from pathlib import Path

from alembic import context
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.pool import NullPool

from app.core.config import load_settings
from app.db.local import local_fixture_url
from app.db.models import Base
from app.db.serviceability import metadata as location_metadata
from app.db.schema import schema_snapshot

BASELINE = "0001_legacy"
LEGACY_MIGRATION = "202611230001_initial"
VERSIONS = Path(__file__).parent / "versions"


def include_object(obj, name, type_, reflected, compare_to):
    return type_ != "table" or name != "_prisma_migrations"


def verify_baseline_stamp(*, ctx, step, heads, run_args):
    if not step.is_stamp:
        return
    if heads != {BASELINE}:
        raise RuntimeError("Only adoption of the legacy baseline is supported by stamp")
    db = ctx.connection
    expected = json.loads((VERSIONS / "0001_legacy_schema.json").read_text(encoding="utf-8"))
    actual = schema_snapshot(db)
    differences = [section for section in expected if expected[section] != actual[section]]
    if differences:
        raise RuntimeError("Legacy database differs from the baseline in: " + ", ".join(differences))
    if not inspect(db).has_table("_prisma_migrations", schema="public"):
        raise RuntimeError("Legacy Prisma migration history is missing")

    sql = (VERSIONS / "0001_legacy.sql").read_text(encoding="utf-8")
    checksums = {
        hashlib.sha256(content.encode("utf-8")).hexdigest()
        for content in (sql, sql.replace("\n", "\r\n"))
    }
    history = db.execute(text("""
        SELECT migration_name, checksum, finished_at
        FROM public._prisma_migrations WHERE rolled_back_at IS NULL
    """)).all()
    if (
        len(history) != 1
        or history[0].migration_name != LEGACY_MIGRATION
        or history[0].finished_at is None
        or history[0].checksum not in checksums
    ):
        raise RuntimeError("Legacy Prisma migration history does not match the baseline")


if context.is_offline_mode():
    raise RuntimeError("Phase 02 migrations require an online local database")

engine = create_engine(local_fixture_url(load_settings()), poolclass=NullPool)
try:
    with engine.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=[Base.metadata, location_metadata],
            include_object=include_object,
            compare_server_default=True,
            on_version_apply=verify_baseline_stamp,
        )
        if context.get_context().opts.get("purge"):
            raise RuntimeError("Purging migration history is disabled")
        with context.begin_transaction():
            connection.execute(text("SET LOCAL search_path TO public"))
            context.run_migrations()
finally:
    engine.dispose()
