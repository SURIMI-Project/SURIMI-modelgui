"""SQL for the catalog's own tables (today `species`)."""

from __future__ import annotations

import re
from collections.abc import Iterable, Sequence
from dataclasses import dataclass

from sqlalchemy import ColumnElement, func, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from surimi_backend.catalog.models import Species, search_vector
from surimi_backend.catalog.schemas import SpeciesSort

MAX_SEARCH_WORDS = 8


async def species_by_codes(db: AsyncSession, codes: Iterable[str]) -> Sequence[Species]:
    """Primary key lookups (`species_pkey`)."""
    wanted = sorted(set(codes))
    if not wanted:
        return []
    return (await db.scalars(select(Species).where(Species.species_code.in_(wanted)))).all()


async def all_species(db: AsyncSession) -> Sequence[Species]:
    return (await db.scalars(select(Species))).all()


async def get_species(db: AsyncSession, code: str) -> Species | None:
    return await db.get(Species, code)


def search_condition(q: str) -> ColumnElement[bool] | None:
    """Every word of `q` must start a word of the code, English or scientific
    name, through the GIN index `species_search_idx`. Only letters and digits
    reach to_tsquery, so no input can break its syntax."""
    words = [w for w in re.split(r"[^\w]+", q.lower()) if w]
    if not words:
        return None
    query = " & ".join(f"{w}:*" for w in words[:MAX_SEARCH_WORDS])
    return search_vector().op("@@")(func.to_tsquery(text("'simple'"), query))


@dataclass(frozen=True, slots=True)
class SpeciesFilters:
    codes: Sequence[str] = ()
    q: str | None = None
    isscaap_group: str | None = None
    family: str | None = None
    order_or_higher_taxa: str | None = None


def _order(sort: SpeciesSort) -> tuple[ColumnElement[str | None], ...]:
    """Ties broken by code, in the same direction, so `(name, species_code)`
    serves both directions (read backwards for descending). PostgreSQL's
    default puts NULL names last ascending and first descending: forcing them
    last both ways would stop the descending sort from using the index."""
    column = {
        "species_code": Species.species_code,
        "name": Species.name,
        "scientific_name": Species.scientific_name,
    }[sort.lstrip("-")]
    descending = sort.startswith("-")
    columns = [column] if column is Species.species_code else [column, Species.species_code]
    return tuple(c.desc() if descending else c.asc() for c in columns)


async def search_species(
    db: AsyncSession,
    filters: SpeciesFilters,
    *,
    sort: SpeciesSort = "species_code",
    page: int = 1,
    size: int = 50,
) -> tuple[Sequence[Species], int]:
    """One page of rows in `sort` order, and the total matching rows."""
    query = select(Species)
    if filters.codes:
        query = query.where(Species.species_code.in_(filters.codes))
    if filters.q and (condition := search_condition(filters.q)) is not None:
        query = query.where(condition)
    for column, value in (
        (Species.isscaap_group, filters.isscaap_group),
        (Species.family, filters.family),
        (Species.order_or_higher_taxa, filters.order_or_higher_taxa),
    ):
        if value:
            query = query.where(column == value)
    total = int(await db.scalar(select(func.count()).select_from(query.subquery())) or 0)
    rows = await db.scalars(query.order_by(*_order(sort)).offset((page - 1) * size).limit(size))
    return rows.all(), total
