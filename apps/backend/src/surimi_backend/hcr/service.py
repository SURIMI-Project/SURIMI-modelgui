"""Harvest control rule configurations (ADR 0018, 0024, 0025): each user keeps
several named sets of rules per scenario, saved and read as a whole. There are
no scenario defaults; the controller's initial biomass and fishing mortality
are the reference values. Only entries the scenario catalog marks
`hcr_eligible` are accepted (ADR 0017): any other fails minutes later at
`CreateRegulations` (**Verified** 2026-10-30)."""

from __future__ import annotations

import uuid
from typing import Any

import structlog
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from surimi_backend.catalog.schemas import ScenarioCatalogOut, SpeciesEntryOut
from surimi_backend.core.errors import ConflictError, InvalidInputError, NotFoundError
from surimi_backend.hcr.models import HcrConfiguration
from surimi_backend.hcr.schemas import (
    MAX_CONFIGURATIONS,
    HcrConfigurationIn,
    HcrConfigurationListOut,
    HcrConfigurationOut,
    HcrIn,
    HcrRuleOut,
)

log = structlog.get_logger("surimi.hcr")


def entry_key(species_code: str, life_stage: str) -> tuple[str, str]:
    return species_code.strip().upper(), life_stage.strip().lower()


def eligible_entries(catalog: ScenarioCatalogOut) -> dict[tuple[str, str], SpeciesEntryOut]:
    return {entry_key(s.species_code, s.life_stage): s for s in catalog.species if s.hcr_eligible}


def label(species_code: str, life_stage: str) -> str:
    return f"{species_code} {life_stage}".strip()


def eligible_labels(entries: dict[tuple[str, str], SpeciesEntryOut]) -> list[str]:
    return sorted(label(e.species_code, e.life_stage) for e in entries.values())


def describe(entries: dict[tuple[str, str], SpeciesEntryOut]) -> str:
    return ", ".join(eligible_labels(entries)) or "none"


def validate_rules(
    catalog: ScenarioCatalogOut, rules: list[HcrIn]
) -> tuple[list[dict[str, Any]], list[str]]:
    """The rules as stored and sent (the contract's spelling of each entry), and
    one problem per entry that is not HCR-eligible or comes twice."""
    entries = eligible_entries(catalog)
    stored: list[dict[str, Any]] = []
    problems: list[str] = []
    seen: set[tuple[str, str]] = set()
    for rule in rules:
        key = entry_key(rule.species_code, rule.life_stage)
        entry = entries.get(key)
        if entry is None:
            log.info(
                "hcr.rejected",
                scenario=catalog.scenario_name,
                species_code=rule.species_code,
                life_stage=rule.life_stage,
            )
            problems.append(
                f"{label(rule.species_code, rule.life_stage)} cannot carry a harvest control "
                f"rule in {catalog.scenario_name}"
            )
        elif key in seen:
            problems.append(
                f"more than one harvest control rule for {label(entry.species_code, entry.life_stage)}"
            )
        else:
            seen.add(key)
            stored.append(
                {
                    "species_code": entry.species_code,
                    "life_stage": entry.life_stage,
                    "biomass_limit_kg": rule.biomass_limit_kg,
                    "biomass_base_kg": rule.biomass_base_kg,
                    "f_max": rule.f_max,
                }
            )
    return stored, problems


def _checked_rules(catalog: ScenarioCatalogOut, rules: list[HcrIn]) -> list[dict[str, Any]]:
    stored, problems = validate_rules(catalog, rules)
    if problems:
        entries = eligible_entries(catalog)
        raise InvalidInputError(
            "; ".join(problems) + f" (eligible: {describe(entries)})",
            details={"problems": problems, "eligible": eligible_labels(entries)},
        )
    return stored


def rule_out(rule: dict[str, Any], catalog: ScenarioCatalogOut) -> HcrRuleOut:
    entries = {entry_key(s.species_code, s.life_stage): s for s in catalog.species}
    entry = entries.get(entry_key(rule["species_code"], rule["life_stage"]))
    return HcrRuleOut(
        species_code=rule["species_code"],
        life_stage=rule["life_stage"],
        biomass_limit_kg=rule["biomass_limit_kg"],
        biomass_base_kg=rule["biomass_base_kg"],
        f_max=rule["f_max"],
        eligible=bool(entry and entry.hcr_eligible),
        kind=entry.kind if entry else "species",
        species_name=entry.name if entry else None,
        members=entry.members if entry else [],
    )


def to_out(configuration: HcrConfiguration, catalog: ScenarioCatalogOut) -> HcrConfigurationOut:
    return HcrConfigurationOut(
        id=configuration.id,
        scenario_name=configuration.scenario_name,
        name=configuration.name,
        rules=[rule_out(r, catalog) for r in configuration.rules],
        created_at=configuration.created_at,
        updated_at=configuration.updated_at,
    )


async def configurations_of(
    db: AsyncSession, owner_id: uuid.UUID, scenario_name: str
) -> list[HcrConfiguration]:
    statement = (
        select(HcrConfiguration)
        .where(
            HcrConfiguration.owner_id == owner_id,
            HcrConfiguration.scenario_name == scenario_name,
        )
        .order_by(func.lower(HcrConfiguration.name))
    )
    return list((await db.execute(statement)).scalars())


async def list_configurations(
    db: AsyncSession, catalog: ScenarioCatalogOut, owner_id: uuid.UUID
) -> HcrConfigurationListOut:
    rows = await configurations_of(db, owner_id, catalog.scenario_name)
    return HcrConfigurationListOut(
        scenario_name=catalog.scenario_name, configurations=[to_out(r, catalog) for r in rows]
    )


async def get_configuration(
    db: AsyncSession, owner_id: uuid.UUID, scenario_name: str, configuration_id: uuid.UUID
) -> HcrConfiguration:
    """Someone else's configuration, or one of another scenario, is a 404 like a
    missing one (ADR 0005)."""
    row = await db.get(HcrConfiguration, configuration_id)
    if row is None or row.owner_id != owner_id or row.scenario_name != scenario_name:
        raise NotFoundError("no such harvest control rule configuration")
    return row


def _name_taken(name: str, scenario_name: str) -> ConflictError:
    return ConflictError(
        f"you already have a configuration called {name!r} for {scenario_name}; "
        "choose another name or change that one"
    )


async def _commit(db: AsyncSession, name: str, scenario_name: str) -> None:
    try:
        await db.commit()
    except IntegrityError as exc:
        await db.rollback()
        raise _name_taken(name, scenario_name) from exc


async def create(
    db: AsyncSession, catalog: ScenarioCatalogOut, owner_id: uuid.UUID, body: HcrConfigurationIn
) -> HcrConfigurationOut:
    rules = _checked_rules(catalog, body.rules)
    count = await db.scalar(
        select(func.count()).where(
            HcrConfiguration.owner_id == owner_id,
            HcrConfiguration.scenario_name == catalog.scenario_name,
        )
    )
    if (count or 0) >= MAX_CONFIGURATIONS:
        raise ConflictError(
            f"you have {MAX_CONFIGURATIONS} configurations for {catalog.scenario_name}, "
            "the most allowed; delete one first"
        )
    row = HcrConfiguration(
        owner_id=owner_id, scenario_name=catalog.scenario_name, name=body.name, rules=rules
    )
    db.add(row)
    await _commit(db, body.name, catalog.scenario_name)
    await db.refresh(row)
    log.info("hcr.configuration_saved", scenario=catalog.scenario_name, rules=len(rules))
    return to_out(row, catalog)


async def replace(
    db: AsyncSession,
    catalog: ScenarioCatalogOut,
    owner_id: uuid.UUID,
    configuration_id: uuid.UUID,
    body: HcrConfigurationIn,
) -> HcrConfigurationOut:
    """Renames the configuration and replaces its whole set of rules. All or
    nothing: one bad entry and nothing changes."""
    row = await get_configuration(db, owner_id, catalog.scenario_name, configuration_id)
    rules = _checked_rules(catalog, body.rules)
    row.name, row.rules = body.name, rules
    await _commit(db, body.name, catalog.scenario_name)
    await db.refresh(row)
    log.info("hcr.configuration_saved", scenario=catalog.scenario_name, rules=len(rules))
    return to_out(row, catalog)


async def remove(
    db: AsyncSession, owner_id: uuid.UUID, scenario_name: str, configuration_id: uuid.UUID
) -> None:
    row = await get_configuration(db, owner_id, scenario_name, configuration_id)
    await db.delete(row)
    await db.commit()
