"""Persist a confirmed delivery preference independently of cart ownership."""
from alembic import op
from sqlalchemy import text

revision = "0003_location_preferences"
down_revision = "0002_location_reference"
branch_labels = None
depends_on = None


def upgrade():
    op.execute("""CREATE TABLE location_preferences (
        company_id TEXT NOT NULL, subject TEXT NOT NULL, pincode TEXT NOT NULL,
        revision INTEGER NOT NULL, confirmed_at TIMESTAMPTZ NOT NULL,
        CONSTRAINT location_preferences_pkey PRIMARY KEY (company_id, subject),
        CONSTRAINT location_preference_revision CHECK (revision > 0),
        CONSTRAINT location_preference_pin CHECK (pincode ~ '^[1-9][0-9]{5}$')
    )""")


def downgrade():
    if op.get_bind().scalar(text("SELECT EXISTS (SELECT 1 FROM location_preferences)")):
        raise RuntimeError("Location data exists; retain saved preferences during application rollback")
    op.drop_table("location_preferences")
