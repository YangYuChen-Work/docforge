"""Add the export comment option."""

from alembic import op
import sqlalchemy as sa


revision = "6f3e8a7b2c1d"
down_revision = "42444aed634c"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "exports",
        sa.Column("include_comments", sa.Boolean(), nullable=False, server_default=sa.false()),
    )


def downgrade() -> None:
    op.drop_column("exports", "include_comments")
