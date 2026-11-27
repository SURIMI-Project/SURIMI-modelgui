"""What the catalog knows about each scenario beyond the contract (ADR 0029,
0030): its functional groups with their member species, its HCR-eligible
entries, where it lies and its known gaps.

A functional group is a contract entry: its code (`DF2`) is the
`species_code` the controller receives. Its members are FAO species codes,
named from the `species` table.

The data lives in the `catalog_*` tables. The shipped first version is in
`catalog/data/catalog/`:

- `scenarios.csv`: `scenario_name`, `notes` (one note per line in the cell);
- `<scenario>.groups.csv`: `GROUP_COLUMNS`, one row per member species, the
  format of the admin export and import;
- `hcr_eligible.csv`: `scenario_name`, `species_code`, `life_stage`.

`surimi-backend seed-catalog` loads them; unit tests without a database read
them directly (`FileScenarioData`).
"""

from __future__ import annotations

import csv
import io
import re
from collections.abc import Iterable, Mapping, Sequence
from dataclasses import dataclass, field
from pathlib import Path
from typing import Protocol

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from surimi_backend.catalog.models import (
    CatalogGroup,
    CatalogGroupSpecies,
    CatalogHcrEligible,
    CatalogScenario,
    GroupNameSource,
)

CATALOG_DIR = Path(__file__).parent / "data" / "catalog"
SCENARIOS_CSV = "scenarios.csv"
HCR_ELIGIBLE_CSV = "hcr_eligible.csv"
GROUPS_SUFFIX = ".groups.csv"

CODE = re.compile(r"^[A-Za-z0-9_]{1,30}$")
SCENARIO = re.compile(r"^[a-z0-9_]{1,64}$")
MAX_VALUE = 300

GROUP_COLUMNS = (
    "group_code",
    "group_name",
    "name_source",
    "species_code",
    "name_in_source",
    "cmsy_group",
    "cmsy_stock_id",
    "continent",
    "region",
    "subregion",
)
# Same on every row of one group, and of one scenario.
GROUP_FIELDS = ("group_name", "name_source")
LOCATION_FIELDS = ("continent", "region", "subregion")


@dataclass(frozen=True, slots=True)
class GroupSpecies:
    species_code: str
    name_in_source: str | None = None
    cmsy_group: str | None = None
    cmsy_stock_id: str | None = None


@dataclass(frozen=True, slots=True)
class Group:
    code: str
    name: str | None
    name_source: str | None
    species: tuple[GroupSpecies, ...]


@dataclass(frozen=True, slots=True)
class Location:
    continent: str | None = None
    region: str | None = None
    subregion: str | None = None


@dataclass(frozen=True, slots=True)
class ScenarioData:
    scenario_name: str
    notes: tuple[str, ...] = ()
    location: Location = Location()
    groups: tuple[Group, ...] = ()
    # (species_code, lower-case life stage)
    hcr_eligible: tuple[tuple[str, str], ...] = ()

    def member_codes(self) -> set[str]:
        return {s.species_code for g in self.groups for s in g.species}

    def codes(self) -> set[str]:
        """Every code this scenario's data names: groups, members, eligible."""
        return (
            {g.code for g in self.groups}
            | self.member_codes()
            | {code for code, _ in self.hcr_eligible}
        )


# --- rows -> groups ------------------------------------------------------------------


@dataclass
class GroupsParse:
    groups: list[Group] = field(default_factory=list)
    location: Location = Location()
    errors: list[tuple[int | None, str]] = field(default_factory=list)


Row = Mapping[str, str | None]


def build_groups(rows: Sequence[tuple[int, Row]]) -> GroupsParse:
    """Groups from rows keyed by `GROUP_COLUMNS` (missing keys = empty), with
    the line of each. Checks: codes, a species once, one name and name source
    per group, one location per scenario, value lengths."""
    out = GroupsParse()
    order: list[str] = []
    heads: dict[str, tuple[int, dict[str, str | None]]] = {}
    members: dict[str, list[GroupSpecies]] = {}
    species_line: dict[str, int] = {}
    location: tuple[int, dict[str, str | None]] | None = None
    for line, row in rows:
        values = {c: (row.get(c) or "").strip() or None for c in GROUP_COLUMNS}
        group, code = values["group_code"] or "", values["species_code"] or ""
        long = [c for c, v in values.items() if v and len(v) > MAX_VALUE]
        if long:
            out.errors.append((line, f"over {MAX_VALUE} characters: {', '.join(long)}"))
            continue
        if not CODE.match(group):
            out.errors.append((line, f"group_code {group!r} is not a code"))
            continue
        if not CODE.match(code):
            out.errors.append((line, f"species_code {code!r} is not a code"))
            continue
        if values["name_source"] not in (None, *GroupNameSource):
            out.errors.append(
                (line, f"name_source must be model_team or manual, got {values['name_source']!r}")
            )
            continue
        if code in species_line:
            out.errors.append(
                (line, f"species_code {code} is also on line {species_line[code]}: a species "
                 "is in one group per scenario")
            )  # fmt: skip
            continue
        head = {c: values[c] for c in GROUP_FIELDS}
        if group not in heads:
            heads[group] = (line, head)
            order.append(group)
            members[group] = []
        elif heads[group][1] != head:
            first, seen = heads[group]
            differ = [c for c in GROUP_FIELDS if seen[c] != head[c]]
            out.errors.append(
                (line, f"group {group}: {', '.join(differ)} differs from line {first}")
            )
            continue
        place = {c: values[c] for c in LOCATION_FIELDS}
        if location is None:
            location = (line, place)
        elif location[1] != place:
            differ = [c for c in LOCATION_FIELDS if location[1][c] != place[c]]
            out.errors.append(
                (
                    line,
                    f"{', '.join(differ)} differs from line {location[0]}: one place per scenario",
                )
            )
            continue
        species_line[code] = line
        members[group].append(
            GroupSpecies(
                species_code=code,
                name_in_source=values["name_in_source"],
                cmsy_group=values["cmsy_group"],
                cmsy_stock_id=values["cmsy_stock_id"],
            )
        )
    # Sorted by code, as the tables return them, so a group read from a file
    # equals the same group read from the database.
    for group in sorted(order):
        head = heads[group][1]
        out.groups.append(
            Group(
                code=group,
                name=head["group_name"],
                name_source=head["name_source"],
                species=tuple(sorted(members[group], key=lambda s: s.species_code)),
            )
        )
    if location:
        out.location = Location(**location[1])
    return out


def format_groups_csv(data: ScenarioData) -> str:
    """The admin export and the shipped `<scenario>.groups.csv`: one row per
    member species, groups and members sorted by code, LF line ends."""
    out = io.StringIO()
    writer = csv.writer(out, lineterminator="\n")
    writer.writerow(GROUP_COLUMNS)
    place = data.location
    for g in data.groups:
        for s in g.species:
            writer.writerow(
                [
                    "" if v is None else v
                    for v in (
                        g.code, g.name, g.name_source, s.species_code, s.name_in_source,
                        s.cmsy_group, s.cmsy_stock_id, place.continent, place.region,
                        place.subregion,
                    )
                ]
            )  # fmt: skip
    return out.getvalue()


# --- shipped files ---------------------------------------------------------------------


def _csv_rows(path: Path, columns: tuple[str, ...]) -> list[tuple[int, dict[str, str]]]:
    reader = csv.reader(io.StringIO(path.read_text(encoding="utf-8").removeprefix("﻿")))
    header = tuple(h.strip() for h in next(reader, ()))
    if header != columns:
        raise ValueError(f"{path.name}: header must be {','.join(columns)}, got {header}")
    rows: list[tuple[int, dict[str, str]]] = []
    for line, cells in enumerate(reader, start=2):
        if not any(c.strip() for c in cells):
            continue
        if len(cells) != len(columns):
            raise ValueError(
                f"{path.name} line {line}: {len(cells)} cells, expected {len(columns)}"
            )
        rows.append((line, dict(zip(columns, cells, strict=True))))
    return rows


def read_shipped(directory: Path = CATALOG_DIR) -> dict[str, ScenarioData]:
    """Every scenario of the shipped files. Raises ValueError, naming the file
    and line, on anything a seed or import would refuse."""
    notes: dict[str, tuple[str, ...]] = {}
    for line, row in _csv_rows(directory / SCENARIOS_CSV, ("scenario_name", "notes")):
        name = row["scenario_name"].strip()
        if not SCENARIO.match(name) or name in notes:
            raise ValueError(f"{SCENARIOS_CSV} line {line}: bad or repeated scenario {name!r}")
        notes[name] = tuple(n.strip() for n in row["notes"].splitlines() if n.strip())

    eligible: dict[str, list[tuple[str, str]]] = {name: [] for name in notes}
    for line, row in _csv_rows(
        directory / HCR_ELIGIBLE_CSV, ("scenario_name", "species_code", "life_stage")
    ):
        name, code = row["scenario_name"].strip(), row["species_code"].strip()
        key = (code, row["life_stage"].strip().lower())
        if name not in eligible:
            raise ValueError(
                f"{HCR_ELIGIBLE_CSV} line {line}: scenario {name!r} not in {SCENARIOS_CSV}"
            )
        if not CODE.match(code) or key in eligible[name]:
            raise ValueError(f"{HCR_ELIGIBLE_CSV} line {line}: bad or repeated entry {code!r}")
        eligible[name].append(key)

    scenarios: dict[str, ScenarioData] = {}
    for name, scenario_notes in notes.items():
        groups = GroupsParse()
        path = directory / f"{name}{GROUPS_SUFFIX}"
        if path.exists():
            groups = build_groups(_csv_rows(path, GROUP_COLUMNS))
            if groups.errors:
                bad_line, message = groups.errors[0]
                raise ValueError(f"{path.name} line {bad_line}: {message}")
        scenarios[name] = ScenarioData(
            scenario_name=name,
            notes=scenario_notes,
            location=groups.location,
            groups=tuple(groups.groups),
            hcr_eligible=tuple(eligible[name]),
        )
    for path in directory.glob(f"*{GROUPS_SUFFIX}"):
        if path.name.removesuffix(GROUPS_SUFFIX) not in scenarios:
            raise ValueError(f"{path.name}: scenario not in {SCENARIOS_CSV}")
    return scenarios


# --- database --------------------------------------------------------------------------


async def load_scenario(db: AsyncSession, scenario_name: str) -> ScenarioData | None:
    """One scenario's rows (primary-key range reads), or None without a row."""
    scenario = await db.get(CatalogScenario, scenario_name)
    if scenario is None:
        return None
    groups = (
        await db.scalars(
            select(CatalogGroup)
            .where(CatalogGroup.scenario_name == scenario_name)
            .order_by(CatalogGroup.group_code)
        )
    ).all()
    members = (
        await db.scalars(
            select(CatalogGroupSpecies)
            .where(CatalogGroupSpecies.scenario_name == scenario_name)
            .order_by(CatalogGroupSpecies.group_code, CatalogGroupSpecies.species_code)
        )
    ).all()
    eligible = (
        await db.scalars(
            select(CatalogHcrEligible)
            .where(CatalogHcrEligible.scenario_name == scenario_name)
            .order_by(CatalogHcrEligible.species_code, CatalogHcrEligible.life_stage)
        )
    ).all()
    by_group: dict[str, list[GroupSpecies]] = {}
    for m in members:
        by_group.setdefault(m.group_code, []).append(
            GroupSpecies(m.species_code, m.name_in_source, m.cmsy_group, m.cmsy_stock_id)
        )
    return ScenarioData(
        scenario_name=scenario_name,
        notes=tuple(str(n) for n in scenario.notes),
        location=Location(scenario.continent, scenario.region, scenario.subregion),
        groups=tuple(
            Group(g.group_code, g.group_name, g.name_source, tuple(by_group.get(g.group_code, [])))
            for g in groups
        ),
        hcr_eligible=tuple((e.species_code, e.life_stage) for e in eligible),
    )


async def codes_in_use(db: AsyncSession) -> set[str]:
    """Species codes the catalog tables name: members, HCR-eligible entries."""
    members = await db.scalars(select(CatalogGroupSpecies.species_code).distinct())
    eligible = await db.scalars(select(CatalogHcrEligible.species_code).distinct())
    return set(members) | set(eligible)


async def scenario_exists(db: AsyncSession, scenario_name: str) -> bool:
    return await db.get(CatalogScenario, scenario_name) is not None


async def write_groups(
    db: AsyncSession, scenario_name: str, groups: Iterable[Group], location: Location
) -> None:
    """Replaces the scenario's groups and members and sets its location. The
    scenario row must exist. Does not commit. Members are deleted by their own
    statement (not left to the cascade) so the session forgets them too."""
    await db.execute(
        delete(CatalogGroupSpecies).where(CatalogGroupSpecies.scenario_name == scenario_name)
    )
    await db.execute(delete(CatalogGroup).where(CatalogGroup.scenario_name == scenario_name))
    scenario = await db.get(CatalogScenario, scenario_name)
    if scenario is None:
        raise LookupError(f"no catalog_scenarios row for {scenario_name}")
    scenario.continent = location.continent
    scenario.region = location.region
    scenario.subregion = location.subregion
    groups = list(groups)
    for g in groups:
        db.add(
            CatalogGroup(
                scenario_name=scenario_name,
                group_code=g.code,
                group_name=g.name,
                name_source=g.name_source,
            )
        )
    await db.flush()  # groups before their members (foreign key)
    for g in groups:
        for s in g.species:
            db.add(
                CatalogGroupSpecies(
                    scenario_name=scenario_name,
                    species_code=s.species_code,
                    group_code=g.code,
                    name_in_source=s.name_in_source,
                    cmsy_group=s.cmsy_group,
                    cmsy_stock_id=s.cmsy_stock_id,
                )
            )
    await db.flush()


async def write_scenario(db: AsyncSession, data: ScenarioData) -> None:
    """Replaces everything of one scenario with `data`. Does not commit."""
    scenario = await db.get(CatalogScenario, data.scenario_name)
    if scenario is None:
        db.add(CatalogScenario(scenario_name=data.scenario_name, notes=list(data.notes)))
        await db.flush()
    else:
        scenario.notes = list(data.notes)
    await write_groups(db, data.scenario_name, data.groups, data.location)
    await db.execute(
        delete(CatalogHcrEligible).where(CatalogHcrEligible.scenario_name == data.scenario_name)
    )
    for code, stage in data.hcr_eligible:
        db.add(
            CatalogHcrEligible(
                scenario_name=data.scenario_name, species_code=code, life_stage=stage
            )
        )
    await db.flush()


@dataclass
class SeedReport:
    inserted: list[str] = field(default_factory=list)
    replaced: list[str] = field(default_factory=list)
    kept: list[str] = field(default_factory=list)

    def lines(self) -> list[str]:
        return [
            f"inserted {', '.join(self.inserted) or 'none'}; "
            f"replaced {', '.join(self.replaced) or 'none'}; "
            f"kept as they are {', '.join(self.kept) or 'none'}"
            + (" (use --update to replace them from the files)" if self.kept else "")
        ]


async def seed_catalog(
    db: AsyncSession, shipped: Mapping[str, ScenarioData], *, update: bool = False
) -> SeedReport:
    """Loads each shipped scenario that has no row; with `update`, replaces
    the ones that have. Admins own a scenario once it is in the table, so a
    deploy (the migrate job, without `update`) never undoes their imports."""
    report = SeedReport()
    for name, data in shipped.items():
        exists = await scenario_exists(db, name)
        if exists and not update:
            report.kept.append(name)
            continue
        await write_scenario(db, data)
        (report.replaced if exists else report.inserted).append(name)
    await db.commit()
    return report


# --- sources the catalog service reads -------------------------------------------------


class ScenarioDataSource(Protocol):
    async def get(self, scenario_name: str) -> ScenarioData | None: ...

    async def codes_in_use(self) -> set[str]: ...


class DbScenarioData:
    """The `catalog_*` tables: what the running app uses."""

    def __init__(self, sessionmaker: async_sessionmaker[AsyncSession]) -> None:
        self._sessionmaker = sessionmaker

    async def get(self, scenario_name: str) -> ScenarioData | None:
        async with self._sessionmaker() as db:
            return await load_scenario(db, scenario_name)

    async def codes_in_use(self) -> set[str]:
        async with self._sessionmaker() as db:
            return await codes_in_use(db)


class FileScenarioData:
    """The shipped files, read once: for tests and runs without a database."""

    def __init__(
        self, directory: Path = CATALOG_DIR, scenarios: Mapping[str, ScenarioData] | None = None
    ) -> None:
        self._scenarios = dict(scenarios) if scenarios is not None else read_shipped(directory)

    async def get(self, scenario_name: str) -> ScenarioData | None:
        return self._scenarios.get(scenario_name)

    async def codes_in_use(self) -> set[str]:
        codes: set[str] = set()
        for data in self._scenarios.values():
            codes |= data.member_codes() | {code for code, _ in data.hcr_eligible}
        return codes
