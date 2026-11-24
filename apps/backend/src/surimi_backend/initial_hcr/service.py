"""The controller's initial HCR data (ADR 0027) and its snapshots (ADR 0028).

Every answer the backend gets is recorded: the entries are put in a canonical
order, hashed, and inserted unless a snapshot with that hash exists, so a new
row appears only when the controller's values change. Callers commit. Names
come from the catalog when a snapshot is read, never from the snapshot, so a
corrected species name neither counts as a new version nor leaves old
snapshots with a stale one.
"""

from __future__ import annotations

import hashlib
import json
import math
import uuid
from dataclasses import asdict, fields
from typing import Any

import structlog
from sqlalchemy.ext.asyncio import AsyncSession

from surimi_backend.catalog.service import CatalogService
from surimi_backend.core.errors import NotFoundError
from surimi_backend.hcr.service import entry_key
from surimi_backend.initial_hcr import repository as repo
from surimi_backend.initial_hcr.models import InitialHcrSnapshot
from surimi_backend.initial_hcr.schemas import (
    ExperimentInitialHcrOut,
    InitialHcrDataOut,
    InitialHcrEntryOut,
    InitialHcrHistoryOut,
    InitialHcrSnapshotSummaryOut,
    RuleAgainstDefaultOut,
)
from surimi_backend.integrations.controller import ControllerError, InitialHcrData

log = structlog.get_logger("surimi.initial_hcr")

_FIELDS = tuple(f.name for f in fields(InitialHcrData))


def _order(d: InitialHcrData) -> tuple[str, str, str, str]:
    return d.species_code, d.length_class, d.age, d.life_stage.lower()


def to_stored(data: list[InitialHcrData]) -> list[dict[str, Any]]:
    """The entries as kept in a snapshot: our field names, the controller's
    values, a fixed order so equal answers hash the same."""
    return [asdict(d) for d in sorted(data, key=_order)]


def from_stored(entries: list[dict[str, Any]]) -> list[InitialHcrData]:
    return [InitialHcrData(**{k: e[k] for k in _FIELDS}) for e in entries]


def content_hash(entries: list[dict[str, Any]]) -> str:
    canonical = json.dumps(entries, sort_keys=True, separators=(",", ":"), allow_nan=False)
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


async def record(
    db: AsyncSession, scenario_name: str, data: list[InitialHcrData]
) -> InitialHcrSnapshot:
    """The snapshot equal to this answer, inserted when new. Does not commit."""
    entries = to_stored(data)
    digest = content_hash(entries)
    snapshot, is_new = await repo.insert_or_get(db, scenario_name, digest, entries)
    if is_new:
        log.info(
            "initial_hcr.snapshot_recorded",
            scenario=scenario_name,
            snapshot_id=str(snapshot.id),
            entries=len(entries),
        )
    return snapshot


def _default(value: float) -> float | None:
    """A default of 0 means none: 0 is outside the protocol's bounds."""
    return value if value > 0 else None


def addressable(data: list[InitialHcrData]) -> dict[tuple[str, str], InitialHcrData]:
    """Entries a rule can name: a rule is per species code and life stage, so
    entries with a length class or age are left out (and logged)."""
    by_key: dict[tuple[str, str], InitialHcrData] = {}
    for d in data:
        if d.length_class or d.age:
            log.info(
                "initial_hcr.unaddressable",
                species_code=d.species_code,
                life_stage=d.life_stage,
                length_class=d.length_class,
                age=d.age,
            )
            continue
        by_key.setdefault(entry_key(d.species_code, d.life_stage), d)
    return by_key


async def named_entries(
    catalog: CatalogService, scenario_name: str, data: list[InitialHcrData]
) -> list[InitialHcrEntryOut]:
    ordered = sorted(data, key=_order)
    names = await catalog.name_entries(
        scenario_name, [(d.species_code, d.life_stage) for d in ordered]
    )
    return [
        InitialHcrEntryOut(
            species_code=d.species_code,
            life_stage=d.life_stage,
            length_class=d.length_class,
            age=d.age,
            species_name=n.species_name,
            scientific_name=n.scientific_name,
            family=n.family,
            functional_group=n.functional_group,
            functional_group_name=n.functional_group_name,
            hcr_eligible=n.hcr_eligible,
            initial_biomass_kg=d.initial_biomass_kg,
            initial_fishing_mortality=d.initial_fishing_mortality,
            default_biomass_limit_kg=_default(d.default_biomass_limit_kg),
            default_biomass_base_kg=_default(d.default_biomass_base_kg),
            default_f_max=_default(d.default_f_max),
        )
        for d, n in zip(ordered, names, strict=True)
    ]


async def _data_out(
    catalog: CatalogService, snapshot: InitialHcrSnapshot, data: list[InitialHcrData]
) -> InitialHcrDataOut:
    return InitialHcrDataOut(
        scenario_name=snapshot.scenario_name,
        snapshot_id=snapshot.id,
        first_seen_at=snapshot.first_seen_at,
        entries=await named_entries(catalog, snapshot.scenario_name, data),
    )


async def live(db: AsyncSession, catalog: CatalogService, scenario_name: str) -> InitialHcrDataOut:
    """The controller's answer now, named, and recorded. 404 for an unknown
    scenario; a controller failure propagates (502, 504)."""
    data = await catalog.initial_hcr_data(scenario_name)
    snapshot = await record(db, scenario_name, data)
    await db.commit()
    return await _data_out(catalog, snapshot, data)


async def capture(
    db: AsyncSession, catalog: CatalogService, scenario_name: str
) -> tuple[InitialHcrSnapshot | None, str | None]:
    """For a new experiment: the snapshot of the controller's answer now, or
    None and the reason when the controller fails (the experiment is still
    accepted, ADR 0028). Does not commit."""
    try:
        data = await catalog.initial_hcr_data(scenario_name)
    except ControllerError as exc:
        log.warning("initial_hcr.capture_failed", scenario=scenario_name, error=exc.message)
        return None, exc.message
    return await record(db, scenario_name, data), None


async def history(
    db: AsyncSession, catalog: CatalogService, scenario_name: str
) -> InitialHcrHistoryOut:
    await catalog.require_scenario(scenario_name)
    return InitialHcrHistoryOut(
        scenario_name=scenario_name,
        snapshots=[
            InitialHcrSnapshotSummaryOut(
                id=row.id,
                content_hash=row.content_hash,
                entry_count=row.entry_count,
                first_seen_at=row.first_seen_at,
            )
            for row in await repo.summaries(db, scenario_name)
        ],
    )


async def snapshot_out(
    db: AsyncSession, catalog: CatalogService, scenario_name: str, snapshot_id: uuid.UUID
) -> InitialHcrDataOut:
    await catalog.require_scenario(scenario_name)
    snapshot = await repo.get(db, snapshot_id)
    if snapshot is None or snapshot.scenario_name != scenario_name:
        raise NotFoundError(f"no initial HCR snapshot {snapshot_id} for {scenario_name}")
    return await _data_out(catalog, snapshot, from_stored(snapshot.entries))


def _differs(value: float, default: float) -> bool:
    # A default shown in tonnes (rounded to 6 decimals, 1 g) and sent back as kg
    # differs from it by up to about 1e-8 relative; a user's change is far larger.
    return not math.isclose(value, default, rel_tol=1e-6)


async def for_experiment(
    db: AsyncSession,
    catalog: CatalogService,
    experiment_id: uuid.UUID,
    snapshot_id: uuid.UUID | None,
    rules: list[dict[str, Any]],
) -> ExperimentInitialHcrOut:
    """The snapshot an experiment was submitted with, and each of its rules
    against the default it could start from. 404 when it has none."""
    snapshot = await repo.get(db, snapshot_id) if snapshot_id else None
    if snapshot is None:
        raise NotFoundError(
            f"experiment {experiment_id} has no initial HCR data: the controller did not "
            "answer when it was submitted, or it was submitted before snapshots existed"
        )
    data = from_stored(snapshot.entries)
    by_key = addressable(data)
    compared: list[RuleAgainstDefaultOut] = []
    for rule in rules:
        d = by_key.get(entry_key(rule["species_code"], rule["life_stage"]))
        limit = _default(d.default_biomass_limit_kg) if d else None
        base = _default(d.default_biomass_base_kg) if d else None
        f_max = _default(d.default_f_max) if d else None
        changed = (
            None
            if limit is None or base is None or f_max is None
            else _differs(rule["biomass_limit_kg"], limit)
            or _differs(rule["biomass_base_kg"], base)
            or _differs(rule["f_max"], f_max)
        )
        compared.append(
            RuleAgainstDefaultOut(
                species_code=rule["species_code"],
                life_stage=rule["life_stage"],
                biomass_limit_kg=rule["biomass_limit_kg"],
                biomass_base_kg=rule["biomass_base_kg"],
                f_max=rule["f_max"],
                default_biomass_limit_kg=limit,
                default_biomass_base_kg=base,
                default_f_max=f_max,
                changed_from_default=changed,
            )
        )
    return ExperimentInitialHcrOut(
        experiment_id=experiment_id,
        initial_hcr_data=await _data_out(catalog, snapshot, data),
        rules=compared,
    )
