"""`/api/v1/scenarios/{name}/initial-hcr-data`: the controller's initial HCR
data, live (ADR 0027), and the history of its snapshots (ADR 0028). Any
signed-in user: the values are the scenario's, not anyone's own. The
experiment's own snapshot is in `experiments/router.py`."""

from __future__ import annotations

import uuid
from typing import Annotated, Any

from fastapi import APIRouter, Depends, Path

from surimi_backend.auth.dependencies import Db, current_principal
from surimi_backend.catalog.router import Catalog
from surimi_backend.initial_hcr import service
from surimi_backend.initial_hcr.schemas import InitialHcrDataOut, InitialHcrHistoryOut

ScenarioName = Annotated[str, Path(min_length=1, max_length=100, pattern=r"^[A-Za-z0-9_\-]+$")]

FROM_CONTROLLER: dict[int | str, dict[str, Any]] = {
    404: {"description": "Unknown scenario"},
    502: {
        "description": "The controller failed, for example because the scenario has no "
        "initial HCR data file in its bucket (on 2026-11-23 only northwestern_med has one)"
    },
    504: {"description": "The controller did not answer in time"},
}

router = APIRouter(
    prefix="/api/v1/scenarios/{scenario_name}/initial-hcr-data",
    tags=["Initial HCR data"],
    dependencies=[Depends(current_principal)],
    responses={401: {"description": "Not signed in"}},
)


@router.get(
    "",
    response_model=InitialHcrDataOut,
    summary="Initial biomass, initial F and the default rule per species, from the controller",
    description=(
        "GetInitialHCRData, asked on every request and never cached (ADR 0027): per species "
        "entry the initial biomass (kg) and fishing mortality, and the controller's default "
        "biomass limit, biomass base (kg) and F max, with the species' names, functional "
        "group and HCR eligibility from the catalog. The answer is recorded as a snapshot "
        "when its values are new; `snapshot_id` names it (ADR 0028)."
    ),
    responses=FROM_CONTROLLER,
)
async def get_initial_hcr_data(
    catalog: Catalog, db: Db, scenario_name: ScenarioName
) -> InitialHcrDataOut:
    return await service.live(db, catalog, scenario_name)


@router.get(
    "/history",
    response_model=InitialHcrHistoryOut,
    summary="Every distinct answer of the controller seen for this scenario, newest first",
    responses={404: {"description": "Unknown scenario"}},
)
async def get_initial_hcr_history(
    catalog: Catalog, db: Db, scenario_name: ScenarioName
) -> InitialHcrHistoryOut:
    return await service.history(db, catalog, scenario_name)


@router.get(
    "/history/{snapshot_id}",
    response_model=InitialHcrDataOut,
    summary="One recorded answer, with today's species names",
    responses={404: {"description": "Unknown scenario, or no such snapshot of it"}},
)
async def get_initial_hcr_snapshot(
    catalog: Catalog, db: Db, scenario_name: ScenarioName, snapshot_id: uuid.UUID
) -> InitialHcrDataOut:
    return await service.snapshot_out(db, catalog, scenario_name, snapshot_id)
