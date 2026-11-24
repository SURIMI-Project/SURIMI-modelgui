"""Snapshots of the controller's initial HCR data (ADR 0028): one row per
distinct `GetInitialHCRData` answer per scenario, found by the SHA-256 of its
entries, and the snapshot each experiment was submitted with. Existing
experiments get none (null): they were submitted before snapshots existed.

Revision ID: 0008_initial_hcr_snapshots
Revises: 0007_hcr_configurations
Create Date: 2026-11-23
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0008_initial_hcr_snapshots"
down_revision: str | None = "0007_hcr_configurations"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "initial_hcr_snapshots",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("scenario_name", sa.Text(), nullable=False),
        sa.Column("content_hash", sa.Text(), nullable=False),
        sa.Column("entries", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("entry_count", sa.Integer(), nullable=False),
        sa.Column(
            "first_seen_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.CheckConstraint(
            "jsonb_typeof(entries) = 'array'",
            name=op.f("initial_hcr_snapshots_entries_array_ck"),
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("initial_hcr_snapshots_pkey")),
    )
    op.create_index(
        "initial_hcr_snapshots_scenario_hash_uq",
        "initial_hcr_snapshots",
        ["scenario_name", "content_hash"],
        unique=True,
    )
    op.add_column("experiments", sa.Column("initial_hcr_snapshot_id", sa.UUID(), nullable=True))
    op.create_foreign_key(
        op.f("experiments_initial_hcr_snapshot_id_fkey"),
        "experiments",
        "initial_hcr_snapshots",
        ["initial_hcr_snapshot_id"],
        ["id"],
        ondelete="RESTRICT",
    )


def downgrade() -> None:
    op.drop_constraint(
        op.f("experiments_initial_hcr_snapshot_id_fkey"), "experiments", type_="foreignkey"
    )
    op.drop_column("experiments", "initial_hcr_snapshot_id")
    op.drop_table("initial_hcr_snapshots")
