"""Scenario catalog tables (ADR 0029, 0030): each scenario's functional groups
(contract entries whose code the controller receives), their member species,
HCR-eligible entries, location and notes. Empty here; `surimi-backend
seed-catalog` loads the shipped CSVs.

Revision ID: 0009_scenario_catalog
Revises: 0008_initial_hcr_snapshots
Create Date: 2026-11-27
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0009_scenario_catalog"
down_revision: str | None = "0008_initial_hcr_snapshots"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "catalog_scenarios",
        sa.Column("scenario_name", sa.Text(), nullable=False),
        sa.Column("continent", sa.Text(), nullable=True),
        sa.Column("region", sa.Text(), nullable=True),
        sa.Column("subregion", sa.Text(), nullable=True),
        sa.Column(
            "notes",
            postgresql.JSONB(astext_type=sa.Text()),
            server_default=sa.text("'[]'::jsonb"),
            nullable=False,
        ),
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
        sa.CheckConstraint(
            "jsonb_typeof(notes) = 'array'", name=op.f("catalog_scenarios_notes_array_ck")
        ),
        sa.PrimaryKeyConstraint("scenario_name", name=op.f("catalog_scenarios_pkey")),
    )
    op.create_table(
        "catalog_groups",
        sa.Column("scenario_name", sa.Text(), nullable=False),
        sa.Column("group_code", sa.Text(), nullable=False),
        sa.Column("group_name", sa.Text(), nullable=True),
        sa.Column("name_source", sa.Text(), nullable=True),
        sa.CheckConstraint(
            "name_source IN ('model_team', 'manual')",
            name=op.f("catalog_groups_name_source_ck"),
        ),
        sa.ForeignKeyConstraint(
            ["scenario_name"],
            ["catalog_scenarios.scenario_name"],
            name=op.f("catalog_groups_scenario_name_fkey"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("scenario_name", "group_code", name=op.f("catalog_groups_pkey")),
    )
    op.create_table(
        "catalog_group_species",
        sa.Column("scenario_name", sa.Text(), nullable=False),
        sa.Column("species_code", sa.Text(), nullable=False),
        sa.Column("group_code", sa.Text(), nullable=False),
        sa.Column("name_in_source", sa.Text(), nullable=True),
        sa.Column("cmsy_group", sa.Text(), nullable=True),
        sa.Column("cmsy_stock_id", sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(
            ["scenario_name", "group_code"],
            ["catalog_groups.scenario_name", "catalog_groups.group_code"],
            name=op.f("catalog_group_species_scenario_name_group_code_fkey"),
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["species_code"],
            ["species.species_code"],
            name=op.f("catalog_group_species_species_code_fkey"),
            ondelete="RESTRICT",
        ),
        sa.PrimaryKeyConstraint(
            "scenario_name", "species_code", name=op.f("catalog_group_species_pkey")
        ),
    )
    op.create_index(
        "catalog_group_species_group_idx",
        "catalog_group_species",
        ["scenario_name", "group_code"],
    )
    op.create_index(
        "catalog_group_species_species_code_idx", "catalog_group_species", ["species_code"]
    )
    op.create_table(
        "catalog_hcr_eligible",
        sa.Column("scenario_name", sa.Text(), nullable=False),
        sa.Column("species_code", sa.Text(), nullable=False),
        sa.Column("life_stage", sa.Text(), server_default="", nullable=False),
        sa.CheckConstraint(
            "life_stage = lower(life_stage)", name=op.f("catalog_hcr_eligible_life_stage_lower_ck")
        ),
        sa.ForeignKeyConstraint(
            ["scenario_name"],
            ["catalog_scenarios.scenario_name"],
            name=op.f("catalog_hcr_eligible_scenario_name_fkey"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint(
            "scenario_name", "species_code", "life_stage", name=op.f("catalog_hcr_eligible_pkey")
        ),
    )


def downgrade() -> None:
    op.drop_table("catalog_hcr_eligible")
    op.drop_index("catalog_group_species_species_code_idx", table_name="catalog_group_species")
    op.drop_index("catalog_group_species_group_idx", table_name="catalog_group_species")
    op.drop_table("catalog_group_species")
    op.drop_table("catalog_groups")
    op.drop_table("catalog_scenarios")
