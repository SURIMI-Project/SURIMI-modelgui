"""What the experiment form needs for one scenario, in one answer
(docs/features/experiments § Experiment form options).

Combines the contract (dates), the scenario catalog (climate scenarios, every
species entry with its names, group and whether it can carry an HCR), the
user's saved HCR configurations (ADR 0025), and the controller's initial HCR
data (ADR 0027): initial biomass and F as reference values, and the default
rule each new rule row starts from. The answer is recorded as a snapshot
(ADR 0028). A controller failure on it is a note, not an error: the form still
opens without it.
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
from surimi_backend.initial_hcr import service as initial_hcr
from surimi_backend.integrations.controller import ControllerError, InitialHcrData


def _default(value: float) -> float | None:
    return value if value > 0 else None


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

    initial: dict[tuple[str, str], InitialHcrData] = {}
    snapshot_id: uuid.UUID | None = None
    try:
        data = await catalog_service.initial_hcr_data(scenario_name)
    except ControllerError as exc:
        notes.append(f"No initial HCR data from the controller: {exc.message}")
    else:
        initial = initial_hcr.addressable(data)
        snapshot_id = (await initial_hcr.record(db, scenario_name, data)).id
        await db.commit()

    group_names = {g.key: g.name for g in catalog.functional_groups}
    species: list[SpeciesOptionOut] = []
    for entry in catalog.species:
        d = initial.get(hcr_service.entry_key(entry.species_code, entry.life_stage))
        species.append(
            SpeciesOptionOut(
                species_code=entry.species_code,
                life_stage=entry.life_stage,
                hcr_eligible=entry.hcr_eligible,
                species_name=entry.name,
                scientific_name=entry.scientific_name,
                functional_group=entry.functional_group,
                functional_group_name=group_names.get(entry.functional_group or ""),
                initial_biomass_kg=d.initial_biomass_kg if d else None,
                initial_fishing_mortality=d.initial_fishing_mortality if d else None,
                default_biomass_limit_kg=_default(d.default_biomass_limit_kg) if d else None,
                default_biomass_base_kg=_default(d.default_biomass_base_kg) if d else None,
                default_f_max=_default(d.default_f_max) if d else None,
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
        initial_values_available=snapshot_id is not None,
        initial_hcr_snapshot_id=snapshot_id,
        notes=notes,
    )
