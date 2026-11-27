"""`/api/v1/scenarios`: the scenarios the controller can run and their
contracts; `/api/v1/species`: species names and higher taxa (ADR 0023). Any
signed-in user (ADR 0005). `/api/v1/admin/species` and
`/api/v1/admin/scenarios/{name}/groups`: admin CSV import and export (ADR 0030)."""

from __future__ import annotations

from dataclasses import asdict
from typing import Annotated, Any

from fastapi import APIRouter, Depends, Path, Query, Request
from fastapi.responses import Response
from pydantic import BaseModel, Field

from surimi_backend.auth.dependencies import AdminUser, Db, current_principal
from surimi_backend.catalog import group_import, species_import
from surimi_backend.catalog import species as species_service
from surimi_backend.catalog.group_import import GroupImportOptions, NameSource
from surimi_backend.catalog.repository import SpeciesFilters
from surimi_backend.catalog.schemas import (
    GroupImportReport,
    ScenarioCatalogOut,
    SpeciesImportMode,
    SpeciesImportReport,
    SpeciesOut,
    SpeciesPage,
    SpeciesSort,
)
from surimi_backend.catalog.service import CatalogService
from surimi_backend.catalog.species_import import Delimiter, ImportOptions, SourceValue
from surimi_backend.core.config import Settings
from surimi_backend.core.errors import PayloadTooLargeError, UnsupportedMediaTypeError

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


ScenarioName = Annotated[str, Path(min_length=1, max_length=100, pattern=r"^[A-Za-z0-9_\-]+$")]


@router.get(
    "/{scenario_name}/contract",
    response_model=ContractOut,
    summary="Simulation contract of one scenario",
    responses={404: {"description": "Unknown scenario"}},
)
async def get_contract(catalog: Catalog, scenario_name: ScenarioName) -> ContractOut:
    return ContractOut(
        scenario_name=scenario_name, simulation=await catalog.contract(scenario_name)
    )


@router.get(
    "/{scenario_name}/catalog",
    response_model=ScenarioCatalogOut,
    summary="Entries (species or functional groups), names and HCR eligibility of one scenario",
    description=(
        "The contract's entries, fleets, markets and climate scenarios. Each entry has its "
        "`kind`: a species, named from the FAO ASFIS list, or a functional group, named "
        "from the scenario's catalog, whose code is what the controller receives and whose "
        "species are in `members` (ADR 0029). Also HCR eligibility, the scenario's location "
        "and the level of each output metric. Built from the catalog tables and the live "
        "contract. Names the sources do not have are null."
    ),
    responses={404: {"description": "Unknown scenario"}},
)
async def get_scenario_catalog(catalog: Catalog, scenario_name: ScenarioName) -> ScenarioCatalogOut:
    return await catalog.scenario_catalog(scenario_name)


species_router = APIRouter(
    prefix="/api/v1/species",
    tags=["Species"],
    dependencies=[Depends(current_principal)],
    responses={401: {"description": "Not signed in"}},
)

SpeciesCode = Annotated[str, Path(pattern=r"^[A-Za-z0-9_]{1,30}$", examples=["HKE"])]


@species_router.get(
    "",
    response_model=SpeciesPage,
    summary="Species names and higher taxa, filtered and searched, a page at a time",
    description=(
        "Every species of the FAO ASFIS list, with English and scientific name, family, "
        "order or higher taxa and ISSCAAP group, plus manual rows for codes ASFIS lacks. "
        "`code` (repeatable) keeps only those codes. `q` keeps rows where every word "
        "starts a word of the code, English or scientific name, ignoring case (`hake`, "
        "`merluc`). `isscaap_group`, `family` and `order_or_higher_taxa` match exactly, "
        "as ASFIS spells them (`32`, `MERLUCCIIDAE`, `GADIFORMES`). `sort`: "
        "`species_code` (default), `name` or `scientific_name`, `-` first for descending; "
        "ties by code. Species without a name come last ascending, first descending."
    ),
)
async def list_species(
    db: Db,
    code: Annotated[
        list[str], Query(max_length=500, examples=[["HKE", "BFT"]], description="Codes to return")
    ] = [],  # noqa: B006 - FastAPI copies query defaults
    q: Annotated[str | None, Query(min_length=1, max_length=100, examples=["hake"])] = None,
    isscaap_group: Annotated[str | None, Query(max_length=10, examples=["32"])] = None,
    family: Annotated[str | None, Query(max_length=100, examples=["MERLUCCIIDAE"])] = None,
    order_or_higher_taxa: Annotated[
        str | None, Query(max_length=100, examples=["GADIFORMES"])
    ] = None,
    sort: SpeciesSort = "species_code",
    page: Annotated[int, Query(ge=1)] = 1,
    size: Annotated[int, Query(ge=1, le=200)] = 50,
) -> SpeciesPage:
    filters = SpeciesFilters(
        codes=code,
        q=q,
        isscaap_group=isscaap_group,
        family=family,
        order_or_higher_taxa=order_or_higher_taxa,
    )
    rows, total = await species_service.list_species(db, filters, sort=sort, page=page, size=size)
    return SpeciesPage(
        items=[SpeciesOut(**asdict(r)) for r in rows], total=total, page=page, size=size
    )


@species_router.get(
    "/{species_code}",
    response_model=SpeciesOut,
    summary="One species code",
    responses={404: {"description": "The code is not in the species table"}},
)
async def get_species(db: Db, species_code: SpeciesCode) -> SpeciesOut:
    return SpeciesOut(**asdict(await species_service.get_species(db, species_code)))


species_admin_router = APIRouter(
    prefix="/api/v1/admin/species",
    tags=["Species (admin)"],
    responses={401: {"description": "Not signed in"}, 403: {"description": "Not an admin"}},
)

CSV_TYPES = ("text/csv", "text/plain")


async def _read_capped(request: Request, limit: int) -> bytes:
    """The body, refused as soon as it passes `limit` bytes."""
    declared = request.headers.get("content-length", "")
    if declared.isdigit() and int(declared) > limit:
        raise PayloadTooLargeError(f"the file is over {limit // (1024 * 1024)} MB")
    chunks: list[bytes] = []
    size = 0
    async for chunk in request.stream():
        size += len(chunk)
        if size > limit:
            raise PayloadTooLargeError(f"the file is over {limit // (1024 * 1024)} MB")
        chunks.append(chunk)
    return b"".join(chunks)


@species_admin_router.get(
    "/export.csv",
    response_class=Response,
    summary="Download the species table as CSV",
    description=(
        "The whole table in the format of the shipped `catalog/data/species.csv`, sorted by "
        "code: it imports back as is, and can be committed as the next default."
    ),
    responses={200: {"content": {"text/csv": {}}}},
)
async def export_species(_: AdminUser, db: Db) -> Response:
    content = await species_import.export_species(db)
    return Response(
        content=content.encode("utf-8"),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": 'attachment; filename="species.csv"'},
    )


@species_admin_router.post(
    "/import",
    response_model=SpeciesImportReport,
    summary="Import species from a CSV, upsert or replace, dry run first",
    description=(
        "The request body is the CSV itself (`Content-Type: text/csv`, UTF-8). `map` "
        "(repeatable `target:header`) names the file column of a table column; unmapped "
        "table columns use the column of the same name, else their ASFIS header, so FAO's "
        "ASFIS file needs no mapping. `upsert` inserts new codes and changes existing rows "
        "in the mapped columns only; `replace` makes the file the table (rows not in it are "
        "deleted, unmapped columns emptied) and refuses to delete a code still in use. "
        "`dry_run=true` (default) only reports. Any error and nothing changes."
    ),
    openapi_extra={
        "requestBody": {
            "required": True,
            "content": {"text/csv": {"schema": {"type": "string"}}},
        }
    },
    responses={
        413: {"description": "Over CATALOG_IMPORT_MAX_MB"},
        415: {"description": "Not text/csv"},
        422: {"description": "Errors in the file (applying): the report is in `details`"},
    },
)
async def import_species(
    *,
    request: Request,
    admin: AdminUser,
    db: Db,
    catalog: Catalog,
    mode: SpeciesImportMode = "upsert",
    dry_run: bool = True,
    map: Annotated[
        list[str],
        Query(
            max_length=20,
            description="Repeatable `target:header`",
            examples=[["species_code:Alpha3_Code", "name:English_name"]],
        ),
    ] = [],  # noqa: B006 - FastAPI copies query defaults
    delimiter: Delimiter = ",",
    default_source: SourceValue = "manual",
) -> SpeciesImportReport:
    content_type = request.headers.get("content-type", "").split(";")[0].strip().lower()
    if content_type not in CSV_TYPES:
        raise UnsupportedMediaTypeError("send the CSV as the body with Content-Type: text/csv")
    settings: Settings = request.app.state.settings
    data = await _read_capped(request, settings.catalog_import_max_mb * 1024 * 1024)
    options = ImportOptions(
        mode=mode,
        dry_run=dry_run,
        mapping=species_import.parse_mapping(map),
        delimiter=delimiter,
        default_source=default_source,
    )
    return await species_import.import_species(
        db, data, options, catalog=catalog, actor_id=admin.user.id
    )


catalog_admin_router = APIRouter(
    prefix="/api/v1/admin/scenarios",
    tags=["Scenario catalog (admin)"],
    responses={401: {"description": "Not signed in"}, 403: {"description": "Not an admin"}},
)


@catalog_admin_router.get(
    "/{scenario_name}/groups/export.csv",
    response_class=Response,
    summary="Download a scenario's functional groups as CSV",
    description=(
        "One row per member species, in the import format (and that of the shipped "
        "`catalog/data/catalog/<scenario>.groups.csv`): it imports back as is. Only the "
        "header when the scenario has no groups."
    ),
    responses={200: {"content": {"text/csv": {}}}, 404: {"description": "Unknown scenario"}},
)
async def export_groups(
    _: AdminUser, db: Db, catalog: Catalog, scenario_name: ScenarioName
) -> Response:
    content = await group_import.export_groups(db, catalog, scenario_name)
    return Response(
        content=content.encode("utf-8"),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{scenario_name}.groups.csv"'},
    )


@catalog_admin_router.post(
    "/{scenario_name}/groups/import",
    response_model=GroupImportReport,
    summary="Replace a scenario's functional groups from a CSV, dry run first",
    description=(
        "The request body is the CSV itself (`Content-Type: text/csv`, UTF-8), one row per "
        "member species. The file becomes the scenario's groups: groups and members not in "
        "it are deleted. `map` (repeatable `target:header`) names the file column of a "
        "table column; unmapped columns use the column of the same name, else the partner "
        "list's header (`Stock`, `GroupMICE`, `Species`, `Name`, `GroupCMSY`, `SpecCode`, "
        "`Continent`, `Region`, `Subregion`, `ScientificName`), so that list imports as sent. "
        "The scientific name is compared with the species table, not stored. Every member "
        "must be in the species table. `dry_run=true` (default) only reports. Any error and "
        "nothing changes. HCR eligibility is not part of the file."
    ),
    openapi_extra={
        "requestBody": {
            "required": True,
            "content": {"text/csv": {"schema": {"type": "string"}}},
        }
    },
    responses={
        404: {"description": "The controller does not serve this scenario"},
        413: {"description": "Over CATALOG_IMPORT_MAX_MB"},
        415: {"description": "Not text/csv"},
        422: {"description": "Errors in the file (applying): the report is in `details`"},
    },
)
async def import_groups(
    *,
    request: Request,
    admin: AdminUser,
    db: Db,
    catalog: Catalog,
    scenario_name: ScenarioName,
    dry_run: bool = True,
    map: Annotated[
        list[str],
        Query(
            max_length=20,
            description="Repeatable `target:header`",
            examples=[["group_code:Stock", "group_name:GroupMICE"]],
        ),
    ] = [],  # noqa: B006 - FastAPI copies query defaults
    delimiter: Delimiter = ",",
    name_source: Annotated[
        NameSource,
        Query(description="The groups' name source when no column maps to name_source"),
    ] = "manual",
) -> GroupImportReport:
    content_type = request.headers.get("content-type", "").split(";")[0].strip().lower()
    if content_type not in CSV_TYPES:
        raise UnsupportedMediaTypeError("send the CSV as the body with Content-Type: text/csv")
    settings: Settings = request.app.state.settings
    data = await _read_capped(request, settings.catalog_import_max_mb * 1024 * 1024)
    options = GroupImportOptions(
        dry_run=dry_run,
        mapping=species_import.parse_mapping(map),
        delimiter=delimiter,
        default_name_source=name_source,
    )
    return await group_import.import_groups(
        db, scenario_name, data, options, catalog=catalog, actor_id=admin.user.id
    )
