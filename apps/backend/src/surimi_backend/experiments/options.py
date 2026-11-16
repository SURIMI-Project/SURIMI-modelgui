"""What the experiment form needs for one scenario, in one answer
(docs/features/experiments § Experiment form options).

Combines the contract (dates), the scenario catalog (climate scenarios, every
species entry with its names, group and whether it can carry an HCR), the
user's saved HCR configurations (ADR 0025; no scenario defaults, ADR 0024), and
the controller's initial biomass and fishing mortality as reference values. A
controller failure on the initial values is a note, not an error: the form
still opens without them.
"""

from __future__ import annotations

import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from surimi_backend.catalog.service import CatalogService
from surimi_backend.core.config import Settings
from surimi_backend.experiments.schemas import (
    ExperimentOptionsOut,
    HcrConfigurationSummaryOut,
    SpeciesOptionOut,
)
from surimi_backend.experiments.service import parse_timestamp
from surimi_backend.hcr import service as hcr_service
from surimi_backend.integrations.controller import ControllerError, SpeciesValue

UNIT_NOTE = (
    "Initial biomass is shown as the controller sends it: no unit is stated (most likely "
    "tonnes over the whole model area, not yet confirmed)."
)


def _by_entry(values: list[SpeciesValue]) -> dict[tuple[str, str], float]:
    return {hcr_service.entry_key(v.species_code, v.life_stage): v.value for v in values}


async def experiment_options(
    db: AsyncSession,
    catalog_service: CatalogService,
    settings: Settings,
    scenario_name: str,
    owner_id: uuid.UUID,
) -> ExperimentOptionsOut:
    contract = await catalog_service.contract(scenario_name)  # 404 for an unknown scenario
    catalog = await catalog_service.scenario_catalog(scenario_name)
    configurations = await hcr_service.configurations_of(db, owner_id, scenario_name)
    notes = list(catalog.notes)

    biomass: dict[tuple[str, str], float] = {}
    mortality: dict[tuple[str, str], float] = {}
    available = True
    try:
        biomass = _by_entry(await catalog_service.initial_biomasses(scenario_name))
        mortality = _by_entry(await catalog_service.initial_fishing_mortalities(scenario_name))
    except ControllerError as exc:
        available = False
        notes.append(f"No initial biomass or fishing mortality from the controller: {exc.message}")
    if available:
        notes.append(UNIT_NOTE)

    group_names = {g.key: g.name for g in catalog.functional_groups}
    species: list[SpeciesOptionOut] = []
    for entry in catalog.species:
        key = hcr_service.entry_key(entry.species_code, entry.life_stage)
        species.append(
            SpeciesOptionOut(
                species_code=entry.species_code,
                life_stage=entry.life_stage,
                hcr_eligible=entry.hcr_eligible,
                species_name=entry.name,
                scientific_name=entry.scientific_name,
                functional_group=entry.functional_group,
                functional_group_name=group_names.get(entry.functional_group or ""),
                initial_biomass=biomass.get(key),
                # An F of 0 is left out of the answer (proto3 default): absent means 0,
                # for an entry the controller has a biomass for.
                initial_fishing_mortality=mortality.get(key, 0.0) if key in biomass else None,
            )
        )
    if not any(s.hcr_eligible for s in species):
        notes.append("No species of this scenario can carry a harvest control rule.")
    return ExperimentOptionsOut(
        scenario_name=scenario_name,
        start_date_time=parse_timestamp(contract.get("start_date_time")),
        maximum_end_date_time=parse_timestamp(contract.get("maximum_end_date_time")),
        climate_scenarios=catalog.climate_scenarios,
        climate_scenario_required=bool(catalog.climate_scenarios),
        pods_single_run=1,
        pods_mse_run=settings.controller_mse_simulations,
        species=species,
        hcr_configurations=[
            HcrConfigurationSummaryOut(
                id=c.id, name=c.name, rule_count=len(c.rules), updated_at=c.updated_at
            )
            for c in configurations
        ],
        initial_values_available=available,
        notes=notes,
    )
