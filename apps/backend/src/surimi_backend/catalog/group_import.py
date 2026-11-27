"""Admin import and export of one scenario's functional groups as CSV
(ADR 0030).

The file becomes the scenario's groups: every group and member species not in
it is deleted. One row per member species; the columns are `GROUP_COLUMNS`
(`scenario_data.py`), or any header mapped onto them. Unmapped columns fall
back to the headers of the partners' list (`Stock`, `GroupMICE`, `Species`,
…), so that file imports as sent. All or nothing, dry run by default,
audited; the apply holds an advisory lock.
"""

from __future__ import annotations

import contextlib
import csv
import hashlib
import io
import uuid
from dataclasses import dataclass, field
from typing import Literal

import structlog
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from surimi_backend.audit import service as audit
from surimi_backend.catalog import repository
from surimi_backend.catalog.models import CatalogScenario
from surimi_backend.catalog.scenario_data import (
    GROUP_COLUMNS,
    Group,
    ScenarioData,
    build_groups,
    format_groups_csv,
    load_scenario,
    write_groups,
)
from surimi_backend.catalog.schemas import GroupImportReport, ImportCount, ImportProblem
from surimi_backend.catalog.service import CatalogService
from surimi_backend.catalog.species_import import Delimiter
from surimi_backend.core.errors import InvalidInputError
from surimi_backend.integrations.controller import ControllerError

log = structlog.get_logger("surimi.catalog")

# Headers of the partners' list (the Aegean MICE list of 2026-11-26).
PARTNER_HEADERS = {
    "group_code": "Stock",
    "group_name": "GroupMICE",
    "species_code": "Species",
    "name_in_source": "Name",
    "cmsy_group": "GroupCMSY",
    "cmsy_stock_id": "SpecCode",
    "continent": "Continent",
    "region": "Region",
    "subregion": "Subregion",
    "scientific_name": "ScientificName",
}
# Read to check against the `species` table, never stored.
CHECK_COLUMNS = ("scientific_name",)
TARGETS = (*GROUP_COLUMNS, *CHECK_COLUMNS)
REQUIRED = ("group_code", "species_code")
MAX_ERRORS = 100
MAX_CODES_SHOWN = 50
# pg_advisory_xact_lock key of group imports ("GRPS").
IMPORT_LOCK = 0x47525053
# Species codes in the saved HCR rules of one scenario (jsonb, ADR 0025).
SCENARIO_RULE_CODES = text(
    "SELECT DISTINCT rule->>'species_code' FROM hcr_configurations, "
    "jsonb_array_elements(rules) AS rule WHERE scenario_name = :scenario"
)

NameSource = Literal["model_team", "manual"]


@dataclass(frozen=True, slots=True)
class GroupImportOptions:
    dry_run: bool = True
    mapping: dict[str, str] = field(default_factory=dict)  # target -> file header
    delimiter: Delimiter = ","
    default_name_source: NameSource = "manual"


@dataclass
class ParsedGroups:
    mapping: dict[str, str] = field(default_factory=dict)
    rows: list[tuple[int, dict[str, str | None]]] = field(default_factory=list)
    errors: list[ImportProblem] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)

    def error(self, line: int | None, message: str) -> None:
        if len(self.errors) < MAX_ERRORS:
            self.errors.append(ImportProblem(line=line, message=message))


def _norm(header: str) -> str:
    return " ".join(header.split()).casefold()


def _fallbacks(index: dict[str, int], options: GroupImportOptions, columns: dict[str, int]) -> None:
    """Unmapped columns: the file column of the same name, else the partner
    list's header."""
    for target in TARGETS:
        if target in columns or target in options.mapping:
            continue
        for candidate in (target, PARTNER_HEADERS.get(target)):
            if candidate and _norm(candidate) in index:
                columns[target] = index[_norm(candidate)]
                break


def _resolve(
    headers: list[str], options: GroupImportOptions, parsed: ParsedGroups
) -> dict[str, int]:
    """Table column -> index of the file column: the mapping, else the same
    name, else the partner list's header."""
    index: dict[str, int] = {}
    for i, header in enumerate(headers):
        index.setdefault(_norm(header), i)
    columns: dict[str, int] = {}
    for target, header in options.mapping.items():
        if target not in TARGETS:
            parsed.error(None, f"map: unknown column {target!r}; use {', '.join(TARGETS)}")
        elif not header:
            continue  # left unmapped on purpose
        elif _norm(header) not in index:
            parsed.error(None, f"map: the file has no column {header!r} for {target}")
        else:
            columns[target] = index[_norm(header)]
    _fallbacks(index, options, columns)
    for target in REQUIRED:
        if target not in columns and not parsed.errors:
            parsed.error(None, f"no file column for {target}: name one with map={target}:<header>")
    used = set(columns.values())
    ignored = [h for i, h in enumerate(headers) if i not in used and h]
    if ignored:
        parsed.warnings.append(f"file columns not mapped, ignored: {', '.join(ignored)}")
    parsed.mapping = {target: headers[i] for target, i in columns.items()}
    return columns


def parse_groups(data: bytes, options: GroupImportOptions) -> ParsedGroups:
    """The rows keyed by table column, with their line, and format errors."""
    parsed = ParsedGroups()
    try:
        content = data.decode("utf-8-sig")
    except UnicodeDecodeError:
        parsed.error(None, "the file is not UTF-8: save it as 'CSV UTF-8'")
        return parsed
    delimiter = "\t" if options.delimiter == "tab" else options.delimiter
    reader = csv.reader(io.StringIO(content), delimiter=delimiter)
    header = next(reader, None)
    if not header or not any(h.strip() for h in header):
        parsed.error(None, "the file is empty or has no header row")
        return parsed
    headers = [h.strip() for h in header]
    columns = _resolve(headers, options, parsed)
    if parsed.errors:
        return parsed
    for line, cells in enumerate(reader, start=2):
        if not any(c.strip() for c in cells):
            continue
        if len(cells) > len(headers):
            parsed.error(line, f"{len(cells)} cells, the header has {len(headers)}")
            continue
        padded = cells + [""] * (len(headers) - len(cells))
        row: dict[str, str | None] = {t: padded[i].strip() or None for t, i in columns.items()}
        if not row.get("name_source"):
            row["name_source"] = options.default_name_source
        parsed.rows.append((line, row))
    return parsed


def groups_from(parsed: ParsedGroups) -> ScenarioData:
    """The file's groups and location; adds structural errors to `parsed`."""
    built = build_groups(parsed.rows)
    for line, message in built.errors:
        parsed.error(line, message)
    if not parsed.rows and not parsed.errors:
        parsed.error(None, "the file has no rows")
    return ScenarioData(scenario_name="-", location=built.location, groups=tuple(built.groups))


def _count(codes: list[str]) -> ImportCount:
    return ImportCount(count=len(codes), codes=codes[:MAX_CODES_SHOWN])


async def _check(
    db: AsyncSession,
    scenario_name: str,
    parsed: ParsedGroups,
    groups: tuple[Group, ...],
    catalog: CatalogService,
) -> None:
    """Errors: members with no `species` row. Warnings: scientific names that
    differ from the table, groups and contract entries that do not match."""
    codes = {s.species_code for g in groups for s in g.species}
    names = {r.species_code: r for r in await repository.species_by_codes(db, codes)}
    for line, row in parsed.rows:
        code = row.get("species_code") or ""
        known = names.get(code)
        if code in codes and known is None:
            parsed.error(line, f"species_code {code} is not in the species table: add it first")
            continue
        given = row.get("scientific_name")
        if (
            given
            and known
            and known.scientific_name
            and _norm(given) != _norm(known.scientific_name)
        ):
            parsed.warnings.append(
                f"line {line}: {code} is {known.scientific_name!r} in the species table, "
                f"{given!r} in the file"
            )
    try:
        contract = await catalog.contract(scenario_name)
    except ControllerError as exc:
        parsed.warnings.append(f"controller unreachable, contract not checked: {exc.message}")
        return
    entries = {str(s.get("species_code", "")) for s in contract.get("items", {}).get("species", [])}
    group_codes = {g.code for g in groups}
    if missing := sorted(group_codes - entries):
        parsed.warnings.append(f"groups not in the contract: {', '.join(missing)}")
    if ungrouped := sorted(entries - group_codes):
        shown = ", ".join(ungrouped[:MAX_CODES_SHOWN])
        parsed.warnings.append(f"contract entries that are no group ({len(ungrouped)}): {shown}")


async def import_groups(
    db: AsyncSession,
    scenario_name: str,
    data: bytes,
    options: GroupImportOptions,
    *,
    catalog: CatalogService,
    actor_id: uuid.UUID,
) -> GroupImportReport:
    """The report; on an apply with errors raises InvalidInputError with it.
    404 when the controller answers and does not serve the scenario."""
    # Unreachable controller: the contract check below says so in a warning.
    with contextlib.suppress(ControllerError):
        await catalog.require_scenario(scenario_name)
    parsed = parse_groups(data, options)
    new = groups_from(parsed) if not parsed.errors else ScenarioData("-")
    if not parsed.errors:
        if not options.dry_run:
            await db.execute(text("SELECT pg_advisory_xact_lock(:key)"), {"key": IMPORT_LOCK})
        await _check(db, scenario_name, parsed, new.groups, catalog)
    current = await load_scenario(db, scenario_name) or ScenarioData(scenario_name)
    before = {g.code: g for g in current.groups}
    after = {g.code: g for g in new.groups}
    added = sorted(after.keys() - before.keys())
    removed = sorted(before.keys() - after.keys())
    changed = sorted(c for c in after.keys() & before.keys() if after[c] != before[c])
    if removed:
        used = set(await db.scalars(SCENARIO_RULE_CODES, {"scenario": scenario_name}))
        if on_rules := sorted(used & set(removed)):
            parsed.warnings.append(
                "saved HCR configurations have rules on removed groups; they are kept and "
                f"flagged as no longer eligible: {', '.join(on_rules)}"
            )
    report = GroupImportReport(
        scenario_name=scenario_name,
        dry_run=options.dry_run,
        applied=False,
        mapping=parsed.mapping,
        rows_read=len(parsed.rows),
        groups=_count([g.code for g in new.groups]),
        species=sum(len(g.species) for g in new.groups),
        added=_count(added),
        removed=_count(removed),
        changed=_count(changed),
        errors=parsed.errors,
        warnings=parsed.warnings,
    )
    log.info(
        "catalog.groups_import_checked",
        scenario=scenario_name,
        dry_run=options.dry_run,
        errors=len(parsed.errors),
        warnings=len(parsed.warnings),
        rows=len(parsed.rows),
    )
    if options.dry_run:
        return report
    if parsed.errors:
        await db.rollback()
        raise InvalidInputError(
            f"the file has {len(parsed.errors)} error(s); nothing was imported",
            details=report.model_dump(),
        )
    if await db.get(CatalogScenario, scenario_name) is None:
        db.add(CatalogScenario(scenario_name=scenario_name, notes=[]))
        await db.flush()
    await write_groups(db, scenario_name, new.groups, new.location)
    counts = {
        "groups": len(new.groups),
        "added": len(added),
        "removed": len(removed),
        "changed": len(changed),
    }
    audit.record(
        db,
        actor_id=actor_id,
        action="catalog.groups_imported",
        target_type="scenario",
        target_id=scenario_name,
        details={
            **counts,
            "species": report.species,
            "sha256": hashlib.sha256(data).hexdigest(),
            "mapping": parsed.mapping,
        },
    )
    await db.commit()
    catalog.clear()
    log.info("catalog.groups_imported", scenario=scenario_name, **counts)
    return report.model_copy(update={"applied": True})


async def export_groups(db: AsyncSession, catalog: CatalogService, scenario_name: str) -> str:
    """The scenario's groups in the import format; only the header when it
    has none. 404 when neither the catalog nor the controller knows it."""
    data = await load_scenario(db, scenario_name)
    if data is None:
        await catalog.require_scenario(scenario_name)
        data = ScenarioData(scenario_name)
    return format_groups_csv(data)


def convert(data: bytes, options: GroupImportOptions) -> str:
    """A partner file in the shipped `<scenario>.groups.csv` format, for the
    build script. Raises ValueError on the first error."""
    parsed = parse_groups(data, options)
    built = groups_from(parsed) if not parsed.errors else ScenarioData("-")
    if parsed.errors:
        first = parsed.errors[0]
        raise ValueError(f"line {first.line}: {first.message}" if first.line else first.message)
    return format_groups_csv(built)
