"""Fresh and restored-copy verification; URLs are supplied by the LOC rehearsal."""

from os import getenv

import pytest
from sqlalchemy import create_engine, text

from app.core.config import Settings
from app.db.local import local_fixture_url
from app.db.schema import schema_snapshot
from app.db.serviceability import metadata


def engine(name):
    url = getenv(name)
    if not url:
        pytest.skip(f"set {name} using tests/parity/loc01-verification.mjs")
    settings = Settings(environment="test", demo_mode=True, database_url=url,
                        quote_secret="isolated-location-migration-test-secret")
    return create_engine(local_fixture_url(settings))


def test_fresh_and_restored_upgrade_preserve_legacy_schema_records_and_history():
    source = engine("LYOR_LOC01_BASELINE_DATABASE_URL")
    restored = engine("LYOR_LOC01_RESTORED_DATABASE_URL")
    fresh = engine("LYOR_LOC01_FRESH_DATABASE_URL")
    try:
        with source.connect() as before, restored.connect() as after, fresh.connect() as new:
            baseline = schema_snapshot(before)
            legacy_names = {row["name"] for row in baseline["tables"]}
            assert len(legacy_names) == 8
            for connection in (after, new):
                actual = schema_snapshot(connection)
                for section, values in baseline.items():
                    assert [row for row in actual[section] if row.get("table_name", row.get("name")) in legacy_names] == values
                assert {row["name"] for row in actual["tables"]} == legacy_names | set(metadata.tables)
                assert connection.scalar(text("SELECT version_num FROM alembic_version")) == "0003_location_preferences"
            for table in sorted(legacy_names):
                query = text(f'SELECT to_jsonb(t)::text FROM "{table}" t ORDER BY to_jsonb(t)::text')
                assert before.scalars(query).all() == after.scalars(query).all()
                assert new.scalar(text(f'SELECT count(*) FROM "{table}"')) == 0
            history = text("SELECT migration_name, checksum, finished_at FROM _prisma_migrations ORDER BY migration_name")
            assert before.execute(history).all() == after.execute(history).all()
    finally:
        for item in (source, restored, fresh):
            item.dispose()
