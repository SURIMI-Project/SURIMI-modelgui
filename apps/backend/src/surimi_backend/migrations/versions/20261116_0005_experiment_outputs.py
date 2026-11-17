"""Output metadata of a finished experiment: `experiment_outputs`, with the
chunk index of its `.nc` and the quality report. The files stay in the
bucket (ADR 0009); the index is built with h5py's chunk API (ADR 0020).

Replaces the unreleased chain 0004_experiments_hcr_kg, 0005_species,
0006_hcr_owner_required and 0007_hcr_configurations (2026-11-16): one migration
per feature, each creating its final tables directly. A database at an old
0004 to 0006 stops with "Can't locate revision" and must be recreated
(docs/CHANGELOG.md); one at the old head 0007_hcr_configurations has the same
schema and needs nothing.

Revision ID: 0005_experiment_outputs
Revises: 0004_experiment_runs
Create Date: 2026-11-16
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0005_experiment_outputs"
down_revision: str | None = "0004_experiment_runs"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "experiment_outputs",
        sa.Column("experiment_id", sa.UUID(), nullable=False),
        sa.Column("uri", sa.Text(), nullable=False),
        sa.Column(
            "state",
            sa.Enum(
                "pending",
                "waiting_for_file",
                "indexing",
                "ready",
                "failed",
                "outputs_missing",
                name="output_state",
            ),
            server_default="pending",
            nullable=False,
        ),
        sa.Column("parser_version", sa.Text(), nullable=True),
        sa.Column("size_bytes", sa.BigInteger(), nullable=True),
        sa.Column("size_seen_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("chunk_index", sa.LargeBinary(), nullable=True),
        sa.Column("report", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("error", sa.Text(), nullable=True),
        sa.Column("attempts", sa.Integer(), server_default="0", nullable=False),
        sa.Column(
            "next_attempt_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("indexed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["experiment_id"],
            ["experiments.id"],
            name=op.f("experiment_outputs_experiment_id_fkey"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("experiment_id", name=op.f("experiment_outputs_pkey")),
    )
    op.create_index(
        "experiment_outputs_todo_idx",
        "experiment_outputs",
        ["next_attempt_at"],
        unique=False,
        postgresql_where=sa.text("state IN ('pending', 'waiting_for_file', 'indexing')"),
    )


def downgrade() -> None:
    op.drop_table("experiment_outputs")
    op.execute("DROP TYPE output_state")
