"""Experiments and how they run: `experiments` (with the admission queue),
`simulations`, `experiment_events`, and `app_settings`.

ADR 0015 (queue columns and indexes), ADR 0019 (the worker's polling), ADR 0021
(events polled from a cursor). Indexes as in docs/database/indexes.sql.

- `experiment_status`: a run the controller reports Finished is
  `copying_results` until its `.nc` is in the bucket and indexed, then
  `completed` (user, 2026-11-12); `initialised` when every simulation is
  Initialised and waits for the controller to start them together
  (SURIMI-controller `117e604`, `ExperimentManager.RunExperimentAsync`). It
  holds pods, so the in-flight index covers it.
- `experiments.request` holds the request as sent, HCR biomass in kg
  (ADR 0022).

Replaces the unreleased chain 0004_experiments_hcr_kg, 0005_species,
0006_hcr_owner_required and 0007_hcr_configurations (2026-11-16): one migration
per feature, each creating its final tables directly. A database at an old
0004 to 0006 stops with "Can't locate revision" and must be recreated
(docs/CHANGELOG.md); one at the old head 0007_hcr_configurations has the same
schema and needs nothing.

Revision ID: 0004_experiment_runs
Revises: 0003_user_names
Create Date: 2026-11-16
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0004_experiment_runs"
down_revision: str | None = "0003_user_names"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "app_settings",
        sa.Column("key", sa.Text(), nullable=False),
        sa.Column("value", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("updated_by", sa.UUID(), nullable=True),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["updated_by"],
            ["users.id"],
            name=op.f("app_settings_updated_by_fkey"),
            ondelete="SET NULL",
        ),
        sa.PrimaryKeyConstraint("key", name=op.f("app_settings_pkey")),
    )
    op.create_table(
        "experiments",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("owner_id", sa.UUID(), nullable=False),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("scenario_name", sa.Text(), nullable=False),
        sa.Column("request", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("protocol_version", sa.Text(), nullable=False),
        sa.Column(
            "status",
            sa.Enum(
                "queued",
                "submitting",
                "submit_failed",
                "submitted",
                "initialising",
                "initialised",
                "running",
                "copying_results",
                "completed",
                "failed",
                "cancelling",
                "cancelled",
                name="experiment_status",
            ),
            server_default="queued",
            nullable=False,
        ),
        sa.Column("controller_status_raw", sa.Text(), nullable=True),
        sa.Column("is_mse_run", sa.Boolean(), nullable=False),
        sa.Column("pods_required", sa.Integer(), nullable=False),
        sa.Column("priority", sa.Integer(), server_default="0", nullable=False),
        sa.Column(
            "queued_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False
        ),
        sa.Column("submit_attempts", sa.Integer(), server_default="0", nullable=False),
        sa.Column("submitted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("finished_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("cancel_requested_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("progress", sa.REAL(), nullable=True),
        sa.Column("last_progress_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("stalled", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("stalled_reason", sa.Text(), nullable=True),
        sa.Column("missing_polls", sa.Integer(), server_default="0", nullable=False),
        sa.Column("error", sa.Text(), nullable=True),
        sa.Column("cloned_from_id", sa.UUID(), nullable=True),
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
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(
            ["cloned_from_id"],
            ["experiments.id"],
            name=op.f("experiments_cloned_from_id_fkey"),
            ondelete="SET NULL",
        ),
        sa.ForeignKeyConstraint(
            ["owner_id"], ["users.id"], name=op.f("experiments_owner_id_fkey"), ondelete="RESTRICT"
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("experiments_pkey")),
    )
    op.create_index(
        "experiments_cloned_from_idx",
        "experiments",
        ["cloned_from_id"],
        unique=False,
        postgresql_where=sa.text("cloned_from_id IS NOT NULL"),
    )
    op.create_index(
        "experiments_created_idx",
        "experiments",
        [sa.literal_column("created_at DESC")],
        unique=False,
        postgresql_where=sa.text("deleted_at IS NULL"),
    )
    op.create_index(
        "experiments_deleted_idx",
        "experiments",
        ["deleted_at"],
        unique=False,
        postgresql_where=sa.text("deleted_at IS NOT NULL"),
    )
    op.create_index(
        "experiments_in_flight_idx",
        "experiments",
        ["status"],
        unique=False,
        postgresql_where=sa.text(
            "status IN ('submitting', 'submitted', 'initialising', 'initialised', 'running', "
            "'cancelling')"
        ),
        postgresql_include=["owner_id", "pods_required"],
    )
    op.create_index(
        "experiments_name_fts_idx",
        "experiments",
        [sa.literal_column("to_tsvector('simple', name)")],
        unique=False,
        postgresql_using="gin",
    )
    op.create_index(
        "experiments_owner_created_idx",
        "experiments",
        ["owner_id", sa.literal_column("created_at DESC")],
        unique=False,
        postgresql_where=sa.text("deleted_at IS NULL"),
    )
    op.create_index(
        "experiments_owner_finished_idx",
        "experiments",
        ["owner_id", "finished_at"],
        unique=False,
        postgresql_where=sa.text("finished_at IS NOT NULL"),
        postgresql_include=["status"],
    )
    op.create_index(
        "experiments_queue_idx",
        "experiments",
        [sa.literal_column("priority DESC"), "queued_at"],
        unique=False,
        postgresql_where=sa.text("status = 'queued'"),
    )
    op.create_index(
        "experiments_stalled_idx",
        "experiments",
        ["last_progress_at"],
        unique=False,
        postgresql_where=sa.text("stalled"),
    )
    op.create_index(
        "experiments_status_created_idx",
        "experiments",
        ["status", sa.literal_column("created_at DESC")],
        unique=False,
        postgresql_where=sa.text("deleted_at IS NULL"),
    )
    op.create_table(
        "experiment_events",
        sa.Column("id", sa.BigInteger(), sa.Identity(always=False), nullable=False),
        sa.Column("experiment_id", sa.UUID(), nullable=False),
        sa.Column("owner_id", sa.UUID(), nullable=False),
        sa.Column("type", sa.Text(), nullable=False),
        sa.Column("data", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column(
            "at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False
        ),
        sa.ForeignKeyConstraint(
            ["experiment_id"],
            ["experiments.id"],
            name=op.f("experiment_events_experiment_id_fkey"),
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["owner_id"],
            ["users.id"],
            name=op.f("experiment_events_owner_id_fkey"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("experiment_events_pkey")),
    )
    op.create_index(
        "experiment_events_experiment_id_id_idx",
        "experiment_events",
        ["experiment_id", "id"],
        unique=False,
    )
    op.create_index(
        "experiment_events_owner_id_id_idx", "experiment_events", ["owner_id", "id"], unique=False
    )
    op.create_table(
        "simulations",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("experiment_id", sa.UUID(), nullable=False),
        sa.Column("sim_order", sa.Integer(), nullable=False),
        sa.Column(
            "status",
            sa.Enum(
                "initialising",
                "initialised",
                "running",
                "finished",
                "failed",
                "cancelled",
                "unknown",
                name="simulation_status",
            ),
            nullable=False,
        ),
        sa.Column("status_raw", sa.Text(), nullable=False),
        sa.Column("start_date_time", sa.DateTime(timezone=True), nullable=True),
        sa.Column("end_date_time", sa.DateTime(timezone=True), nullable=True),
        sa.Column("simulation_started", sa.DateTime(timezone=True), nullable=True),
        sa.Column("simulation_current", sa.DateTime(timezone=True), nullable=True),
        sa.Column("duration", sa.Interval(), nullable=True),
        sa.Column("ecology_host", sa.Text(), nullable=True),
        sa.Column(
            "first_seen_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "last_seen_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "status_since",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["experiment_id"],
            ["experiments.id"],
            name=op.f("simulations_experiment_id_fkey"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("simulations_pkey")),
    )
    op.create_index(
        "simulations_experiment_id_sim_order_uq",
        "simulations",
        ["experiment_id", "sim_order"],
        unique=True,
    )


def downgrade() -> None:
    op.drop_table("simulations")
    op.drop_table("experiment_events")
    op.drop_table("experiments")
    op.drop_table("app_settings")
    for enum_type in ("experiment_status", "simulation_status"):
        op.execute(f"DROP TYPE {enum_type}")
