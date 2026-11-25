"""Create the unchanged legacy marketplace schema on a fresh database."""

from pathlib import Path

from alembic import op

revision = "0001_legacy"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Immutable snapshot of the original Prisma SQL, independent of the ORM models.
    sql = Path(__file__).with_suffix(".sql").read_text(encoding="utf-8")
    for statement in sql.split(";"):
        if statement.strip():
            op.execute(statement)


def downgrade() -> None:
    raise RuntimeError("Dropping the legacy baseline is disabled; use the verified restore procedure")
