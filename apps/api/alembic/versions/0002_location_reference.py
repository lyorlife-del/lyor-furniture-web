"""Add offline postal-reference and delivery eligibility configuration."""

from pathlib import Path

from alembic import op
from sqlalchemy import text

revision = "0002_location_reference"
down_revision = "0001_legacy"
branch_labels = None
depends_on = None


def upgrade() -> None:
    for statement in Path(__file__).with_suffix(".sql").read_text(encoding="utf-8").split(";"):
        if statement.strip():
            op.execute(statement)


def downgrade() -> None:
    # Historical reference/audit/configuration must survive application rollback.
    db = op.get_bind()
    tables = (
        "serviceability_audit", "delivery_zone_pincodes", "delivery_zones",
        "serviceability_configuration", "delivery_cities", "postal_code_areas",
        "postal_codes", "postal_reference_versions",
    )
    if any(db.scalar(text(f'SELECT EXISTS (SELECT 1 FROM "{name}" LIMIT 1)')) for name in tables):
        raise RuntimeError("Location data exists; disable the feature and retain its audit/reference tables")
    for name in tables:
        op.drop_table(name)
