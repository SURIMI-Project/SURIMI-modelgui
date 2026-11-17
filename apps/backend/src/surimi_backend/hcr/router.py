"""`/api/v1/scenarios/{name}/hcr-configurations`: a user's named sets of
harvest control rules for a scenario (ADR 0018, 0024, 0025). No scenario
defaults and no admin routes."""

from __future__ import annotations

import uuid
from typing import Annotated, Any

from fastapi import APIRouter, Path, status

from surimi_backend.auth.dependencies import CurrentUser, Db
from surimi_backend.catalog.router import Catalog
from surimi_backend.hcr import service
from surimi_backend.hcr.schemas import (
    HcrConfigurationIn,
    HcrConfigurationListOut,
    HcrConfigurationOut,
)

ScenarioName = Annotated[str, Path(min_length=1, max_length=100, pattern=r"^[A-Za-z0-9_\-]+$")]

ERRORS: dict[int | str, dict[str, Any]] = {
    401: {"description": "Not signed in"},
    404: {"description": "Unknown scenario, or no such configuration of yours"},
    409: {"description": "Name already used for this scenario, or 50 configurations already"},
    422: {
        "description": "An entry not HCR-eligible in this scenario or given twice (every "
        "problem and the eligible entries are listed), limit not below base, or a bad name"
    },
}

router = APIRouter(
    prefix="/api/v1/scenarios/{scenario_name}/hcr-configurations",
    tags=["Harvest control rules"],
)


@router.get(
    "",
    response_model=HcrConfigurationListOut,
    summary="Your HCR configurations for a scenario, with their rules",
    responses=ERRORS,
)
async def list_configurations(
    scenario_name: ScenarioName, principal: CurrentUser, db: Db, catalog: Catalog
) -> HcrConfigurationListOut:
    return await service.list_configurations(
        db, await catalog.scenario_catalog(scenario_name), principal.user.id
    )


@router.post(
    "",
    response_model=HcrConfigurationOut,
    status_code=status.HTTP_201_CREATED,
    summary="Save a new named configuration (biomass in kg)",
    responses=ERRORS,
)
async def create_configuration(
    scenario_name: ScenarioName,
    body: HcrConfigurationIn,
    principal: CurrentUser,
    db: Db,
    catalog: Catalog,
) -> HcrConfigurationOut:
    return await service.create(
        db, await catalog.scenario_catalog(scenario_name), principal.user.id, body
    )


@router.get(
    "/{configuration_id}",
    response_model=HcrConfigurationOut,
    summary="One of your configurations",
    responses=ERRORS,
)
async def get_configuration(
    scenario_name: ScenarioName,
    configuration_id: uuid.UUID,
    principal: CurrentUser,
    db: Db,
    catalog: Catalog,
) -> HcrConfigurationOut:
    scenario = await catalog.scenario_catalog(scenario_name)
    row = await service.get_configuration(db, principal.user.id, scenario_name, configuration_id)
    return service.to_out(row, scenario)


@router.put(
    "/{configuration_id}",
    response_model=HcrConfigurationOut,
    summary="Rename a configuration and replace its whole set of rules",
    responses=ERRORS,
)
async def replace_configuration(
    scenario_name: ScenarioName,
    configuration_id: uuid.UUID,
    body: HcrConfigurationIn,
    principal: CurrentUser,
    db: Db,
    catalog: Catalog,
) -> HcrConfigurationOut:
    return await service.replace(
        db, await catalog.scenario_catalog(scenario_name), principal.user.id, configuration_id, body
    )


@router.delete(
    "/{configuration_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete one of your configurations",
    responses=ERRORS,
)
async def delete_configuration(
    scenario_name: ScenarioName, configuration_id: uuid.UUID, principal: CurrentUser, db: Db
) -> None:
    await service.remove(db, principal.user.id, scenario_name, configuration_id)
