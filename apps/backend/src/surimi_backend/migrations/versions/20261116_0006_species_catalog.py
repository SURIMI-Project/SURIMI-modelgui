"""Table `species`: names and higher taxa of every species of the FAO ASFIS
list, global to every scenario (ADR 0023, step 1 of the catalog in the
database), with its search, filter and sort indexes (docs/database/indexes.sql).
Rows are loaded by `surimi-backend seed-species` from
`catalog/data/species.csv`, not by this migration.

Replaces the unreleased chain 0004_experiments_hcr_kg, 0005_species,
0006_hcr_owner_required and 0007_hcr_configurations (2026-11-16): one migration
per feature, each creating its final tables directly. A database at an old
0004 to 0006 stops with "Can't locate revision" and must be recreated
(docs/CHANGELOG.md); one at the old head 0007_hcr_configurations has the same
schema and needs nothing.

Revision ID: 0006_species_catalog
Revises: 0005_experiment_outputs
Create Date: 2026-11-16
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0006_species_catalog"
down_revision: str | None = "0005_experiment_outputs"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "species",
        sa.Column("species_code", sa.Text(), nullable=False),
        sa.Column("name", sa.Text(), nullable=True),
        sa.Column("scientific_name", sa.Text(), nullable=True),
        sa.Column("family", sa.Text(), nullable=True),
        sa.Column("order_or_higher_taxa", sa.Text(), nullable=True),
        sa.Column("isscaap_group", sa.Text(), nullable=True),
        sa.Column("source", sa.Text(), nullable=False),
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
        sa.CheckConstraint("source IN ('asfis', 'manual')", name=op.f("species_source_ck")),
        sa.PrimaryKeyConstraint("species_code", name=op.f("species_pkey")),
    )
    # Same expression as catalog.models.SEARCH_DOCUMENT, or the planner skips it.
    op.create_index(
        "species_search_idx",
        "species",
        [
            sa.text(
                "to_tsvector('simple', species_code || ' ' || coalesce(name, '') || ' ' "
                "|| coalesce(scientific_name, ''))"
            )
        ],
        unique=False,
        postgresql_using="gin",
    )
    op.create_index("species_isscaap_group_idx", "species", ["isscaap_group"], unique=False)
    op.create_index("species_family_idx", "species", ["family"], unique=False)
    op.create_index(
        "species_order_or_higher_taxa_idx", "species", ["order_or_higher_taxa"], unique=False
    )
    # Sorting a page by name or scientific name without sorting the whole table.
    op.create_index("species_name_idx", "species", ["name", "species_code"], unique=False)
    op.create_index(
        "species_scientific_name_idx", "species", ["scientific_name", "species_code"], unique=False
    )


def downgrade() -> None:
    op.drop_table("species")
