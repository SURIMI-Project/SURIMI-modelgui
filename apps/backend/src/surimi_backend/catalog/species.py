"""Species names and higher taxa (ADR 0023, step 1).

`catalog/data/species.csv` holds every species of the FAO ASFIS list with six
of its fields, plus `manual` rows for codes in use that ASFIS lacks. `scripts/build_species_csv.py` writes
it; `surimi-backend seed-species` loads it into the `species` table, from which
the API serves it. Unit tests without a database read the file directly
(`CsvSpeciesLookup`), so the catalog sees the same names either way.
"""

from __future__ import annotations

import csv
import io
import re
from collections.abc import Iterable
from dataclasses import astuple, dataclass, field, fields
from pathlib import Path
from typing import Protocol

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from surimi_backend.catalog import repository
from surimi_backend.catalog.models import Species, SpeciesSource
from surimi_backend.catalog.schemas import SpeciesSort
from surimi_backend.core.errors import NotFoundError

CATALOG_DATA_DIR = Path(__file__).parent / "data"
SPECIES_CSV = CATALOG_DATA_DIR / "species.csv"
CODE = re.compile(r"^[A-Za-z0-9_]{1,30}$")


@dataclass(frozen=True, slots=True)
class SpeciesRow:
    """One row of the file and of the table; empty fields are None."""

    species_code: str
    name: str | None = None
    scientific_name: str | None = None
    family: str | None = None
    order_or_higher_taxa: str | None = None
    isscaap_group: str | None = None
    source: str = SpeciesSource.ASFIS

    @classmethod
    def from_model(cls, row: Species) -> SpeciesRow:
        return cls(**{f.name: getattr(row, f.name) for f in fields(cls)})


COLUMNS = tuple(f.name for f in fields(SpeciesRow))


def parse_species_csv(text: str) -> list[SpeciesRow]:
    """Rows of the file. Raises ValueError, naming the line, on a wrong header,
    a bad code or source, or a code that appears twice."""
    reader = csv.reader(io.StringIO(text.removeprefix("﻿")))
    header = next(reader, None)
    if header is None or tuple(c.strip() for c in header) != COLUMNS:
        raise ValueError(f"species file header must be {','.join(COLUMNS)}, got {header}")
    rows: list[SpeciesRow] = []
    seen: set[str] = set()
    for line, cells in enumerate(reader, start=2):
        if not any(c.strip() for c in cells):
            continue
        if len(cells) != len(COLUMNS):
            raise ValueError(f"line {line}: {len(cells)} cells, expected {len(COLUMNS)}")
        values = dict(zip(COLUMNS, (c.strip() for c in cells), strict=True))
        code, source = values["species_code"], values["source"]
        if not CODE.match(code):
            raise ValueError(f"line {line}: species_code {code!r} is not a code")
        if source not in tuple(SpeciesSource):
            raise ValueError(f"line {line}: source must be asfis or manual, got {source!r}")
        if code in seen:
            raise ValueError(f"line {line}: species_code {code} appears twice")
        seen.add(code)
        optional = {name: values[name] or None for name in COLUMNS[1:-1]}
        rows.append(SpeciesRow(species_code=code, source=source, **optional))
    return rows


def format_species_csv(rows: Iterable[SpeciesRow]) -> str:
    """The file's text, sorted by code, LF line ends."""
    out = io.StringIO()
    writer = csv.writer(out, lineterminator="\n")
    writer.writerow(COLUMNS)
    for row in sorted(rows, key=lambda r: r.species_code):
        writer.writerow(["" if v is None else v for v in astuple(row)])
    return out.getvalue()


def read_species_file(path: Path = SPECIES_CSV) -> list[SpeciesRow]:
    return parse_species_csv(path.read_text(encoding="utf-8"))


class SpeciesLookup(Protocol):
    """Where the catalog gets species names from."""

    async def get(self, codes: Iterable[str]) -> dict[str, SpeciesRow]: ...


class DbSpeciesLookup:
    """The `species` table: what the running app uses."""

    def __init__(self, sessionmaker: async_sessionmaker[AsyncSession]) -> None:
        self._sessionmaker = sessionmaker

    async def get(self, codes: Iterable[str]) -> dict[str, SpeciesRow]:
        async with self._sessionmaker() as db:
            found = await repository.species_by_codes(db, codes)
        return {r.species_code: SpeciesRow.from_model(r) for r in found}


class CsvSpeciesLookup:
    """The shipped file, read once: for tests and runs without a database."""

    def __init__(self, path: Path = SPECIES_CSV) -> None:
        self._rows = {r.species_code: r for r in read_species_file(path)}

    async def get(self, codes: Iterable[str]) -> dict[str, SpeciesRow]:
        return {c: self._rows[c] for c in codes if c in self._rows}


@dataclass
class SeedReport:
    inserted: list[str] = field(default_factory=list)
    updated: list[str] = field(default_factory=list)
    unchanged: int = 0
    kept: list[str] = field(default_factory=list)  # differ from the file, not updated
    not_in_file: list[str] = field(default_factory=list)  # kept, never deleted

    def lines(self) -> list[str]:
        out = [
            f"inserted {len(self.inserted)}, updated {len(self.updated)}, "
            f"unchanged {self.unchanged}, kept as they are {len(self.kept)}, "
            f"in the table but not the file {len(self.not_in_file)}"
        ]
        if self.updated:
            out.append(f"  updated: {', '.join(self.updated)}")
        if self.kept:
            shown = ", ".join(self.kept[:50]) + (" …" if len(self.kept) > 50 else "")
            out.append(f"  differ from the file, kept (use --update to overwrite): {shown}")
        if self.not_in_file:
            out.append(f"  kept, not in the file: {', '.join(self.not_in_file)}")
        return out


async def seed_species(
    db: AsyncSession, rows: list[SpeciesRow], *, update: bool = False
) -> SeedReport:
    """Inserts the codes the table lacks; with `update`, also overwrites rows
    that differ from the file. Never deletes. Admins own the rows through the
    species import, so a deploy (the migrate job, without `update`) must not
    undo their changes."""
    report = SeedReport()
    existing = {r.species_code: r for r in await repository.all_species(db)}
    for row in rows:
        current = existing.pop(row.species_code, None)
        if current is None:
            db.add(Species(**{c: getattr(row, c) for c in COLUMNS}))
            report.inserted.append(row.species_code)
        elif SpeciesRow.from_model(current) == row:
            report.unchanged += 1
        elif update:
            for column in COLUMNS[1:]:
                setattr(current, column, getattr(row, column))
            report.updated.append(row.species_code)
        else:
            report.kept.append(row.species_code)
    report.not_in_file = sorted(existing)
    await db.commit()
    return report


async def list_species(
    db: AsyncSession,
    filters: repository.SpeciesFilters,
    *,
    sort: SpeciesSort = "species_code",
    page: int,
    size: int,
) -> tuple[list[SpeciesRow], int]:
    rows, total = await repository.search_species(db, filters, sort=sort, page=page, size=size)
    return [SpeciesRow.from_model(r) for r in rows], total


async def get_species(db: AsyncSession, code: str) -> SpeciesRow:
    row = await repository.get_species(db, code)
    if row is None:
        raise NotFoundError(f"species {code!r} is not in the species table")
    return SpeciesRow.from_model(row)
