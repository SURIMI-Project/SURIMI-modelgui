"""Harvest control rule configurations: several named sets of rules per user
and scenario, the rules of each a `jsonb` array, biomass in kg (ADR 0018,
0022, 0024: no scenario defaults, 0025). The API checks every rule (bounds,
eligibility, one per entry) before it writes; the database checks that
`rules` is an array and the name's length, and keeps names unique per owner
and scenario without case.

Replaces the unreleased chain 0004_experiments_hcr_kg, 0005_species,
0006_hcr_owner_required and 0007_hcr_configurations (2026-11-16): one migration
per feature, each creating its final tables directly. A database at an old
0004 to 0006 stops with "Can't locate revision" and must be recreated
(docs/CHANGELOG.md); one at the old head 0007_hcr_configurations has the same
schema and needs nothing.

Revision ID: 0007_hcr_configurations
Revises: 0006_species_catalog
Create Date: 2026-11-16
"""

from collections.abc import Sequence
from datetime import datetime

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0007_hcr_configurations"
down_revision: str | None = "0006_species_catalog"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def _timestamps() -> list[sa.Column[datetime]]:
    return [
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
    ]


def upgrade() -> None:
    op.create_table(
        "hcr_configurations",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("owner_id", sa.UUID(), nullable=False),
        sa.Column("scenario_name", sa.Text(), nullable=False),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column(
            "rules",
            postgresql.JSONB(astext_type=sa.Text()),
            server_default=sa.text("'[]'::jsonb"),
            nullable=False,
        ),
        *_timestamps(),
        sa.CheckConstraint(
            "jsonb_typeof(rules) = 'array'", name=op.f("hcr_configurations_rules_array_ck")
        ),
        sa.CheckConstraint(
            "length(name) BETWEEN 1 AND 100", name=op.f("hcr_configurations_name_length_ck")
        ),
        sa.ForeignKeyConstraint(
            ["owner_id"],
            ["users.id"],
            name=op.f("hcr_configurations_owner_id_fkey"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("hcr_configurations_pkey")),
    )
    op.create_index(
        "hcr_configurations_name_uq",
        "hcr_configurations",
        ["owner_id", "scenario_name", sa.literal_column("lower(name)")],
        unique=True,
    )


def downgrade() -> None:
    op.drop_table("hcr_configurations")
