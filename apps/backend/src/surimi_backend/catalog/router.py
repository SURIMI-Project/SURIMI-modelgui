"""`/api/v1/scenarios`: the scenarios the controller can run and their
contracts. Any signed-in user (ADR 0005)."""

from __future__ import annotations

from typing import Annotated, Any

from fastapi import APIRouter, Depends, Path, Request
from pydantic import BaseModel, Field

from surimi_backend.auth.dependencies import current_principal
from surimi_backend.catalog.service import CatalogService

router = APIRouter(
    prefix="/api/v1/scenarios",
    tags=["Scenarios"],
    dependencies=[Depends(current_principal)],
    responses={401: {"description": "Not signed in"}},
)


def get_catalog(request: Request) -> CatalogService:
    catalog: CatalogService = request.app.state.catalog
    return catalog


Catalog = Annotated[CatalogService, Depends(get_catalog)]


class ScenarioOut(BaseModel):
    name: str = Field(examples=["northwestern_med"])


class ScenarioListOut(BaseModel):
    scenarios: list[ScenarioOut]


class ContractOut(BaseModel):
    scenario_name: str = Field(examples=["northwestern_med"])
    simulation: dict[str, Any] = Field(
        description=(
            "`surimi.v1.Simulation` from GetSimulationContract, as protobuf JSON with the "
            "field names of the .proto: case_study_name, start_date_time, "
            "maximum_end_date_time, time_step, geography, standards, items."
        ),
        examples=[
            {
                "case_study_name": "northwestern_med",
                "start_date_time": "2013-01-01T00:00:00Z",
                "maximum_end_date_time": "2030-12-01T00:00:00Z",
                "time_step": "P1M",
            }
        ],
    )


@router.get("", response_model=ScenarioListOut, summary="List the scenarios the controller can run")
async def list_scenarios(catalog: Catalog) -> ScenarioListOut:
    names = await catalog.scenario_names()
    return ScenarioListOut(scenarios=[ScenarioOut(name=n) for n in names])


@router.get(
    "/{scenario_name}/contract",
    response_model=ContractOut,
    summary="Simulation contract of one scenario",
    responses={404: {"description": "Unknown scenario"}},
)
async def get_contract(
    catalog: Catalog,
    scenario_name: Annotated[str, Path(min_length=1, max_length=100, pattern=r"^[A-Za-z0-9_\-]+$")],
) -> ContractOut:
    return ContractOut(
        scenario_name=scenario_name, simulation=await catalog.contract(scenario_name)
    )
