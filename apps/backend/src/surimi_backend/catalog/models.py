"""Species names and higher taxa, global to every scenario (ADR 0023).

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

from sqlalchemy import CheckConstraint, ColumnElement, DateTime, Index, Text, func, text
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
