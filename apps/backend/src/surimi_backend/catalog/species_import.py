"""Admin import and export of species as CSV (docs/features/scenario-catalog,
step 2).

An import maps the file's columns onto the table's, checks every row, then
either upserts (new codes inserted, existing rows changed in the mapped
columns only, nothing deleted) or replaces (the file becomes the table). It is
all or nothing: one error and nothing changes. A dry run reports what an
apply would do. The apply holds an advisory lock, so two imports cannot
interleave, and is audited.
"""

from __future__ import annotations

import csv
import hashlib
import io
import uuid
from dataclasses import dataclass, field
from typing import Any, Literal

import structlog
from sqlalchemy import delete, text
from sqlalchemy.ext.asyncio import AsyncSession

from surimi_backend.audit import service as audit
from surimi_backend.catalog import repository
from surimi_backend.catalog.models import Species, SpeciesSource
from surimi_backend.catalog.scenario_catalog import species_codes
from surimi_backend.catalog.schemas import (
    ImportCount,
    ImportProblem,
    SpeciesImportMode,
    SpeciesImportReport,
)
from surimi_backend.catalog.service import CatalogService
from surimi_backend.catalog.species import CODE, COLUMNS, SpeciesRow, format_species_csv
from surimi_backend.core.errors import InvalidInputError
from surimi_backend.integrations.controller import ControllerError

log = structlog.get_logger("surimi.catalog")

Delimiter = Literal[",", ";", "tab"]
SourceValue = Literal["asfis", "manual"]

# Used when a table column has no file column of its own name: FAO's ASFIS
# file (ASFIS_sp_2024.csv) then imports with no mapping at all.
ASFIS_HEADERS = {
    "species_code": "Alpha3_Code",
    "name": "English_name",
    "scientific_name": "Scientific_Name",
    "family": "Family",
    "order_or_higher_taxa": "Order or higher taxa",
    "isscaap_group": "ISSCAAP_Group",
}
MAX_VALUE = 300
MAX_ERRORS = 100
MAX_CODES_SHOWN = 50
# pg_advisory_xact_lock key of species imports ("SPEC").
IMPORT_LOCK = 0x53504543


@dataclass(frozen=True, slots=True)
class ImportOptions:
    mode: SpeciesImportMode = "upsert"
    dry_run: bool = True
    mapping: dict[str, str] = field(default_factory=dict)  # target -> file header
    delimiter: Delimiter = ","
    default_source: SourceValue = "manual"


@dataclass
class _Parsed:
    mapping: dict[str, str] = field(default_factory=dict)
    rows: list[dict[str, str | None]] = field(default_factory=list)
    read: int = 0
    errors: list[ImportProblem] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)

    def error(self, line: int | None, message: str) -> None:
        self.errors.append(ImportProblem(line=line, message=message))


def _norm(header: str) -> str:
    return " ".join(header.split()).casefold()


def parse_mapping(pairs: list[str]) -> dict[str, str]:
    """`target:header` query values; the header may itself contain colons. An
    empty header (`target:`) leaves the table column unmapped, even when the
    file has a column of its name."""
    mapping: dict[str, str] = {}
    for pair in pairs:
        target, sep, header = pair.partition(":")
        if not sep or not target.strip():
            raise InvalidInputError(f"map must be target:header, got {pair!r}")
        mapping[target.strip()] = header.strip()
    return mapping


def _resolve(headers: list[str], options: ImportOptions, parsed: _Parsed) -> dict[str, int]:
    """Table column -> index of the file column, explicit mapping first."""
    index: dict[str, int] = {}
    for i, header in enumerate(headers):
        index.setdefault(_norm(header), i)
    columns: dict[str, int] = {}
    for target, header in options.mapping.items():
        if target not in COLUMNS:
            parsed.error(None, f"map: unknown table column {target!r}; use {', '.join(COLUMNS)}")
        elif not header:
            continue  # left unmapped on purpose
        elif _norm(header) not in index:
            parsed.error(None, f"map: the file has no column {header!r} for {target}")
        else:
            columns[target] = index[_norm(header)]
    for target in COLUMNS:
        if target in columns or target in options.mapping:
            continue
        for candidate in (target, ASFIS_HEADERS.get(target)):
            if candidate and _norm(candidate) in index:
                columns[target] = index[_norm(candidate)]
                break
    if "species_code" not in columns and not parsed.errors:
        parsed.error(
            None, "no file column for species_code: name one with map=species_code:<header>"
        )
    used = set(columns.values())
    ignored = [h for i, h in enumerate(headers) if i not in used and h]
    if ignored:
        parsed.warnings.append(f"file columns not mapped, ignored: {', '.join(ignored)}")
    parsed.mapping = {target: headers[i] for target, i in columns.items()}
    return columns


def parse_import(data: bytes, options: ImportOptions) -> _Parsed:
    parsed = _Parsed()
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

    seen: dict[str, int] = {}
    for line, cells in enumerate(reader, start=2):
        if not any(c.strip() for c in cells):
            continue
        parsed.read += 1
        if len(parsed.errors) >= MAX_ERRORS:
            continue
        if len(cells) > len(headers):
            parsed.error(line, f"{len(cells)} cells, the header has {len(headers)}")
            continue
        padded = cells + [""] * (len(headers) - len(cells))
        row: dict[str, str | None] = {t: padded[i].strip() or None for t, i in columns.items()}
        code = row.get("species_code") or ""
        if not CODE.match(code):
            parsed.error(line, f"species_code {code!r} is not a code")
            continue
        if code in seen:
            parsed.error(line, f"species_code {code} is also on line {seen[code]}")
            continue
        seen[code] = line
        too_long = [t for t, v in row.items() if v and len(v) > MAX_VALUE]
        if too_long:
            parsed.error(line, f"over {MAX_VALUE} characters: {', '.join(too_long)}")
            continue
        source = row.get("source") or options.default_source
        if source not in tuple(SpeciesSource):
            parsed.error(line, f"source must be asfis or manual, got {source!r}")
            continue
        row["source"] = source
        parsed.rows.append(row)
    if len(parsed.errors) >= MAX_ERRORS:
        parsed.warnings.append(f"stopped listing errors after {MAX_ERRORS}")
    return parsed


# Species codes in the rules of every saved HCR configuration (jsonb, ADR 0025).
RULE_CODES = text(
    "SELECT DISTINCT rule->>'species_code' FROM hcr_configurations, "
    "jsonb_array_elements(rules) AS rule"
)


async def codes_in_use(db: AsyncSession, catalog: CatalogService) -> tuple[set[str], list[str]]:
    """Codes a `replace` must not delete: catalog group members and HCR-eligible
    entries, the rules of saved HCR configurations, and the live contracts."""
    codes = await catalog.catalog_codes()
    codes |= set(await db.scalars(RULE_CODES))
    warnings: list[str] = []
    try:
        for scenario in await catalog.scenario_names():
            codes |= species_codes(await catalog.contract(scenario), None)
    except ControllerError as exc:
        warnings.append(f"controller unreachable, contract codes not checked: {exc.message}")
    return codes, warnings


def _count(codes: list[str]) -> ImportCount:
    return ImportCount(count=len(codes), codes=codes[:MAX_CODES_SHOWN])


@dataclass
class _Plan:
    existing: dict[str, Species] = field(default_factory=dict)
    changes: dict[str, dict[str, str | None]] = field(default_factory=dict)
    inserted: list[str] = field(default_factory=list)
    updated: list[str] = field(default_factory=list)
    deleted: list[str] = field(default_factory=list)
    unchanged: int = 0


async def _plan(
    db: AsyncSession, parsed: _Parsed, options: ImportOptions, catalog: CatalogService
) -> _Plan:
    """What the import would change; errors for codes `replace` may not delete."""
    plan = _Plan(existing={r.species_code: r for r in await repository.all_species(db)})
    # upsert: only the columns the file maps, so an unmapped `source` never
    # turns existing ASFIS rows into `default_source`; replace: every column.
    targets = [c for c in COLUMNS[1:] if options.mode == "replace" or c in parsed.mapping]
    for row in parsed.rows:
        code = row["species_code"] or ""
        current = plan.existing.get(code)
        if current is None:
            plan.changes[code] = {c: row.get(c) for c in COLUMNS[1:]}
            plan.inserted.append(code)
            continue
        new = {c: row.get(c) for c in targets}
        if any(getattr(current, c) != v for c, v in new.items()):
            plan.changes[code] = new
            plan.updated.append(code)
        else:
            plan.unchanged += 1
    if options.mode == "replace":
        in_file = {row["species_code"] for row in parsed.rows}
        plan.deleted = sorted(set(plan.existing) - in_file)
        if plan.deleted:
            in_use, warnings = await codes_in_use(db, catalog)
            parsed.warnings.extend(warnings)
            blocked = sorted(set(plan.deleted) & in_use)
            if blocked:
                more = " …" if len(blocked) > MAX_CODES_SHOWN else ""
                parsed.error(
                    None,
                    f"cannot delete {len(blocked)} code(s) still used by a catalog, an HCR or "
                    f"a contract: {', '.join(blocked[:MAX_CODES_SHOWN])}{more}",
                )
    return plan


async def _apply(
    db: AsyncSession, plan: _Plan, *, actor_id: uuid.UUID, details: dict[str, Any]
) -> None:
    """Writes the plan and its audit event in the import's transaction."""
    for code in plan.inserted:
        db.add(Species(species_code=code, **plan.changes[code]))
    for code in plan.updated:
        for column, value in plan.changes[code].items():
            setattr(plan.existing[code], column, value)
    if plan.deleted:
        await db.execute(delete(Species).where(Species.species_code.in_(plan.deleted)))
    audit.record(
        db,
        actor_id=actor_id,
        action="species.imported",
        target_type="species",
        target_id=str(details["mode"]),
        details=details,
    )
    await db.commit()


async def import_species(
    db: AsyncSession,
    data: bytes,
    options: ImportOptions,
    *,
    catalog: CatalogService,
    actor_id: uuid.UUID,
) -> SpeciesImportReport:
    """The report; on an apply with errors raises InvalidInputError with it."""
    parsed = parse_import(data, options)
    plan = _Plan()
    if not parsed.errors:
        if not options.dry_run:
            await db.execute(text("SELECT pg_advisory_xact_lock(:key)"), {"key": IMPORT_LOCK})
        plan = await _plan(db, parsed, options, catalog)
    report = SpeciesImportReport(
        mode=options.mode,
        dry_run=options.dry_run,
        applied=False,
        mapping=parsed.mapping,
        default_source=options.default_source,
        rows_read=parsed.read,
        inserted=_count(sorted(plan.inserted)),
        updated=_count(sorted(plan.updated)),
        unchanged=plan.unchanged,
        deleted=_count(plan.deleted),
        errors=parsed.errors,
        warnings=parsed.warnings,
    )
    log.info(
        "catalog.import_checked",
        dry_run=options.dry_run,
        mode=options.mode,
        errors=len(parsed.errors),
        warnings=len(parsed.warnings),
        rows=parsed.read,
    )
    if options.dry_run:
        return report
    if parsed.errors:
        await db.rollback()
        raise InvalidInputError(
            f"the file has {len(parsed.errors)} error(s); nothing was imported",
            details=report.model_dump(),
        )
    counts = {
        "inserted": len(plan.inserted),
        "updated": len(plan.updated),
        "deleted": len(plan.deleted),
    }
    await _apply(
        db,
        plan,
        actor_id=actor_id,
        details={
            "mode": options.mode,
            **counts,
            "rows_read": parsed.read,
            "sha256": hashlib.sha256(data).hexdigest(),
            "mapping": parsed.mapping,
        },
    )
    catalog.clear()  # names of catalogs built from the old rows
    log.info("catalog.imported", mode=options.mode, **counts)
    return report.model_copy(update={"applied": True})


async def export_species(db: AsyncSession) -> str:
    """The whole table in the shipped `species.csv` format."""
    rows = await repository.all_species(db)
    return format_species_csv(SpeciesRow.from_model(r) for r in rows)
