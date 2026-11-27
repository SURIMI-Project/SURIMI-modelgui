"""Species names and higher taxa, global to every scenario (ADR 0023), and
each scenario's functional groups, their member species and HCR eligibility
(ADR 0029, 0030).

One row per FAO ASFIS `Alpha3_Code` (the whole list, ~13,600), loaded from
`catalog/data/species.csv` by `surimi-backend seed-species`. A code in use that
ASFIS lacks has a `manual` row whose fields stay empty until someone knows them.

Indexes (docs/database/README.md § Indexing): the primary key serves every
lookup by code; `species_search_idx` serves the word search of
`GET /api/v1/species?q=`; one B-tree per higher-taxon column serves the
`isscaap_group`, `family` and `order_or_higher_taxa` filters;
`species_name_idx` and `species_scientific_name_idx` serve `sort=name` and
`sort=scientific_name` (read backwards for descending), so a page does not
sort the whole table.
"""

from __future__ import annotations

import enum
from datetime import datetime
from typing import Any

from sqlalchemy import (
    CheckConstraint,
    ColumnElement,
    DateTime,
    ForeignKey,
    ForeignKeyConstraint,
    Index,
    Text,
    func,
    text,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from surimi_backend.core.db import Base

# The searched text. Written as SQL, not built from bound values, so the query
# and `species_search_idx` share one expression and PostgreSQL uses the index
# (asyncpg would send bound values as $n placeholders, which do not match it).
SEARCH_DOCUMENT = (
    "species_code || ' ' || coalesce(name, '') || ' ' || coalesce(scientific_name, '')"
)


def search_vector() -> ColumnElement[str]:
    """`to_tsvector('simple', …)`: lower-cased words, no stemming, no stop
    words, so codes and Latin names stay as written."""
    return func.to_tsvector(text("'simple'"), text(SEARCH_DOCUMENT))


class SpeciesSource(enum.StrEnum):
    ASFIS = "asfis"  # fields copied from the FAO ASFIS list
    MANUAL = "manual"  # a code ASFIS lacks; fields typed by a person, or empty


class Species(Base):
    __tablename__ = "species"

    species_code: Mapped[str] = mapped_column(Text, primary_key=True)
    name: Mapped[str | None] = mapped_column(Text)
    scientific_name: Mapped[str | None] = mapped_column(Text)
    family: Mapped[str | None] = mapped_column(Text)
    # As ASFIS spells it: an order, or a higher rank with sub-ranks in brackets.
    order_or_higher_taxa: Mapped[str | None] = mapped_column(Text)
    isscaap_group: Mapped[str | None] = mapped_column(Text)
    source: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    __table_args__ = (
        CheckConstraint("source IN ('asfis', 'manual')", name="source"),
        Index("species_search_idx", search_vector(), postgresql_using="gin"),
        Index("species_isscaap_group_idx", "isscaap_group"),
        Index("species_family_idx", "family"),
        Index("species_order_or_higher_taxa_idx", "order_or_higher_taxa"),
        Index("species_name_idx", "name", "species_code"),
        Index("species_scientific_name_idx", "scientific_name", "species_code"),
    )


class GroupNameSource(enum.StrEnum):
    MODEL_TEAM = "model_team"  # from a list the model's team sent (the Aegean MICE list)
    MANUAL = "manual"  # typed by an admin


class CatalogScenario(Base):
    """One row per scenario the catalog knows. A scenario with a row is owned
    by admins: `seed-catalog` leaves it alone unless asked to update it."""

    __tablename__ = "catalog_scenarios"

    scenario_name: Mapped[str] = mapped_column(Text, primary_key=True)
    # Where the scenario lies, as the partner list spells it (CMSY++ id_file).
    continent: Mapped[str | None] = mapped_column(Text)
    region: Mapped[str | None] = mapped_column(Text)
    subregion: Mapped[str | None] = mapped_column(Text)
    # Known gaps, one line each.
    notes: Mapped[list[Any]] = mapped_column(JSONB, server_default=text("'[]'::jsonb"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    __table_args__ = (CheckConstraint("jsonb_typeof(notes) = 'array'", name="notes_array"),)


class CatalogGroup(Base):
    """A functional group: a contract entry whose code (`group_code`) is the
    `species_code` the controller receives (ADR 0029)."""

    __tablename__ = "catalog_groups"

    scenario_name: Mapped[str] = mapped_column(
        Text, ForeignKey("catalog_scenarios.scenario_name", ondelete="CASCADE"), primary_key=True
    )
    group_code: Mapped[str] = mapped_column(Text, primary_key=True)
    group_name: Mapped[str | None] = mapped_column(Text)
    name_source: Mapped[str | None] = mapped_column(Text)

    __table_args__ = (
        CheckConstraint("name_source IN ('model_team', 'manual')", name="name_source"),
    )


class CatalogGroupSpecies(Base):
    """A species of a functional group. A species is in one group per
    scenario (the primary key). Its names come from `species`; the file's own
    name is kept in `name_in_source`."""

    __tablename__ = "catalog_group_species"

    scenario_name: Mapped[str] = mapped_column(Text, primary_key=True)
    species_code: Mapped[str] = mapped_column(
        Text, ForeignKey("species.species_code", ondelete="RESTRICT"), primary_key=True
    )
    group_code: Mapped[str] = mapped_column(Text)
    name_in_source: Mapped[str | None] = mapped_column(Text)
    cmsy_group: Mapped[str | None] = mapped_column(Text)  # CMSY++ `Group`
    cmsy_stock_id: Mapped[str | None] = mapped_column(Text)  # CMSY++ `SpecCode`

    __table_args__ = (
        ForeignKeyConstraint(
            ["scenario_name", "group_code"],
            ["catalog_groups.scenario_name", "catalog_groups.group_code"],
            ondelete="CASCADE",
        ),
        # The foreign key's columns, for the cascade from catalog_groups.
        Index("catalog_group_species_group_idx", "scenario_name", "group_code"),
        # Deleting or renaming a species code checks this table.
        Index("catalog_group_species_species_code_idx", "species_code"),
    )


class CatalogHcrEligible(Base):
    """Contract entries that can carry a harvest control rule (ADR 0017,
    0027). `life_stage` is lower case, empty when the entry has none."""

    __tablename__ = "catalog_hcr_eligible"

    scenario_name: Mapped[str] = mapped_column(
        Text, ForeignKey("catalog_scenarios.scenario_name", ondelete="CASCADE"), primary_key=True
    )
    species_code: Mapped[str] = mapped_column(Text, primary_key=True)
    life_stage: Mapped[str] = mapped_column(Text, primary_key=True, server_default="")

    __table_args__ = (CheckConstraint("life_stage = lower(life_stage)", name="life_stage_lower"),)
