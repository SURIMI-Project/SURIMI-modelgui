"""`/api/v1/experiments/{id}/outputs…`: an experiment's outputs read in place
(docs/features/experiment-outputs). Owner or admin (ADR 0005)."""

from __future__ import annotations

import asyncio
import hashlib
import json
import math
import re
import struct
import uuid
from collections.abc import Sequence
from datetime import UTC, datetime, timedelta
from typing import Annotated, Any, Literal

from fastapi import APIRouter, Depends, Query, Request, Response, status
from fastapi.responses import JSONResponse, RedirectResponse
from pydantic import BaseModel, Field

from surimi_backend.audit import service as audit
from surimi_backend.auth.dependencies import AdminUser, AppSettings, CurrentUser, Db, Principal
from surimi_backend.auth.errors import ForbiddenError
from surimi_backend.catalog.router import Catalog
from surimi_backend.catalog.schemas import ScenarioCatalogOut
from surimi_backend.core.errors import ConflictError, NotFoundError
from surimi_backend.experiments import service as experiments
from surimi_backend.experiments.events import emit
from surimi_backend.experiments.models import Experiment, ExperimentStatus
from surimi_backend.outputs import queries
from surimi_backend.outputs.index import OutputIndex, Variable
from surimi_backend.outputs.models import ExperimentOutput, OutputState
from surimi_backend.outputs.read import Array, OutputReader
from surimi_backend.outputs.storage import OutputStorage

router = APIRouter(
    prefix="/api/v1/experiments/{experiment_id}/outputs", tags=["Experiment outputs"]
)
admin_router = APIRouter(prefix="/api/v1/admin/experiments", tags=["Admin: experiments and queue"])

ERRORS: dict[int | str, dict[str, Any]] = {
    401: {"description": "Not signed in"},
    403: {"description": "The .bin is for admins"},
    404: {"description": "No such experiment of yours, or no outputs yet"},
    409: {"description": "Outputs not ready (the state is in the message)"},
    422: {"description": "Unknown metric, species, group, fleet, market or period"},
    503: {"description": "Output storage cannot be reached"},
}
IMMUTABLE = "private, max-age=31536000, immutable"
Month = Annotated[str | None, Query(pattern=r"^\d{4}-\d{2}$", examples=["2020-06"])]


def get_storage(request: Request) -> OutputStorage:
    storage: OutputStorage = request.app.state.output_storage
    return storage


def get_reader(request: Request) -> OutputReader:
    reader: OutputReader = request.app.state.output_reader
    return reader


Storage = Annotated[OutputStorage, Depends(get_storage)]
Reader = Annotated[OutputReader, Depends(get_reader)]


class OutputsOut(BaseModel):
    experiment_id: uuid.UUID
    state: OutputState | None = Field(description="null: the run has not finished")
    error: str | None
    size_bytes: int | None
    indexed_at: datetime | None
    parser_version: str | None
    report: dict[str, Any] | None = Field(description="Data-quality counts per metric")
    months: list[str] = Field(default_factory=list, description="YYYY-MM, in order")
    species: list[dict[str, Any]] = Field(default_factory=list)
    fleets: list[dict[str, Any]] = Field(
        default_factory=list, description="`index` is the fleet parameter"
    )
    markets: list[str] = Field(default_factory=list)
    series_metrics: list[str] = Field(default_factory=list)
    map_metrics: list[str] = Field(default_factory=list)
    metric_levels: dict[str, str] = Field(default_factory=dict)
    grid: dict[str, Any] | None = None


class FileOut(BaseModel):
    file: Literal["nc", "bin"]
    size_bytes: int | None
    download_path: str


async def _owned(
    db: Db, principal: Principal, experiment_id: uuid.UUID
) -> tuple[Experiment, ExperimentOutput | None]:
    experiment = await experiments.visible(db, principal, experiment_id)
    return experiment, await db.get(ExperimentOutput, experiment_id)


async def _ready(
    db: Db, principal: Principal, experiment_id: uuid.UUID, reader: OutputReader
) -> tuple[Experiment, ExperimentOutput, OutputIndex]:
    experiment, row = await _owned(db, principal, experiment_id)
    if row is None:
        raise NotFoundError(f"no outputs: the experiment is {experiment.status.value}")
    if row.state is not OutputState.READY or row.chunk_index is None or row.parser_version is None:
        raise ConflictError(
            f"outputs are {row.state.value}" + (f": {row.error}" if row.error else "")
        )
    return experiment, row, reader.index(row.experiment_id, row.parser_version, row.chunk_index)


def _etag(row: ExperimentOutput, request: Request) -> str:
    key = f"{row.experiment_id}|{row.parser_version}|{row.indexed_at}|{request.url.query}"
    return '"' + hashlib.sha256(key.encode()).hexdigest()[:32] + '"'


def _not_modified(request: Request, etag: str) -> Response | None:
    if request.headers.get("if-none-match") == etag:
        return Response(
            status_code=status.HTTP_304_NOT_MODIFIED,
            headers={"ETag": etag, "Cache-Control": IMMUTABLE},
        )
    return None


def _reader_for(reader: OutputReader, row: ExperimentOutput) -> queries.ReadBox:
    def read(var: Variable, box: Sequence[slice]) -> Array:
        return reader.read_box_sync(row.uri, row.experiment_id, var, box)

    return read


@router.get(
    "",
    response_model=OutputsOut,
    summary="State, quality report and what can be asked",
    responses=ERRORS,
)
async def outputs(
    experiment_id: uuid.UUID, principal: CurrentUser, db: Db, reader: Reader, catalog: Catalog
) -> OutputsOut:
    experiment, row = await _owned(db, principal, experiment_id)
    if row is None:
        return OutputsOut(
            experiment_id=experiment.id, state=None, error=None, size_bytes=None,
            indexed_at=None, parser_version=None, report=None,
        )  # fmt: skip
    out = OutputsOut(
        experiment_id=experiment.id,
        state=row.state,
        error=row.error,
        size_bytes=row.size_bytes,
        indexed_at=row.indexed_at,
        parser_version=row.parser_version,
        report=row.report,
    )
    if row.state is OutputState.READY and row.chunk_index and row.parser_version:
        index = reader.index(row.experiment_id, row.parser_version, row.chunk_index)
        scenario: ScenarioCatalogOut | None
        try:
            scenario = await catalog.scenario_catalog(experiment.scenario_name)
        except Exception:  # noqa: BLE001 - names are a nicety; the axes come from the file
            scenario = None
        names = (
            {(s.species_code, s.life_stage.lower()): s for s in scenario.species}
            if scenario
            else {}
        )
        out.months = index.months
        out.species = [
            {
                **s,
                "name": getattr(
                    names.get((s["species_code"], s["life_stage"].lower())), "name", None
                ),
                "functional_group": getattr(
                    names.get((s["species_code"], s["life_stage"].lower())),
                    "functional_group",
                    None,
                ),
            }
            for s in index.axes["species"]
        ]
        out.fleets = [{"index": i, **f} for i, f in enumerate(index.axes["fleets"])]
        out.markets = index.axes["markets"]
        out.series_metrics = [
            m for m, spec in queries.SERIES_METRICS.items() if spec.variable in index.variables
        ]
        out.map_metrics = [
            m for m, spec in queries.MAP_METRICS.items() if spec.variable in index.variables
        ]
        out.metric_levels = dict(scenario.metric_levels) if scenario else {}
        lat, lon = index.axes["lat"], index.axes["lon"]
        out.grid = {
            "lat": [min(lat), max(lat)],
            "lon": [min(lon), max(lon)],
            "shape": [len(lat), len(lon)],
        }
    return out


@router.get("/series", summary="A monthly or yearly series; cached for good", responses=ERRORS)
async def series(
    request: Request,
    experiment_id: uuid.UUID,
    principal: CurrentUser,
    db: Db,
    reader: Reader,
    catalog: Catalog,
    metric: Annotated[str, Query(examples=["gross_catch"])],
    species: Annotated[str | None, Query(max_length=20, examples=["HKE"])] = None,
    life_stage: Annotated[str | None, Query(max_length=30)] = None,
    functional_group: Annotated[
        str | None, Query(max_length=20, description="Group key from the catalog")
    ] = None,
    fleet: Annotated[
        int | None, Query(ge=0, description="Index from GET …/outputs fleets; summed when omitted")
    ] = None,
    market: Annotated[str | None, Query(max_length=20)] = None,
    period: queries.Period = "month",
    start: Month = None,
    end: Month = None,
) -> Response:
    experiment, row, index = await _ready(db, principal, experiment_id, reader)
    etag = _etag(row, request)
    if (cached := _not_modified(request, etag)) is not None:
        return cached
    scenario = await catalog.scenario_catalog(experiment.scenario_name)
    body = await asyncio.to_thread(
        queries.series,
        index,
        scenario,
        _reader_for(reader, row),
        metric=metric,
        selection=queries.Selection(species, life_stage, functional_group, fleet, market),
        period=period,
        start=start,
        end=end,
    )
    return JSONResponse(body, headers={"ETag": etag, "Cache-Control": IMMUTABLE})


@router.get(
    "/maps",
    summary="One lat x lon grid for a month or a year; cached for good",
    description="`format=json` (default): `values` rows by latitude, null where empty. "
    "`format=binary`: 4-byte little-endian header length, the JSON header, then the "
    "grid as float32 little-endian, row-major, NaN where empty.",
    responses=ERRORS,
)
async def maps(
    request: Request,
    experiment_id: uuid.UUID,
    principal: CurrentUser,
    db: Db,
    reader: Reader,
    catalog: Catalog,
    metric: Annotated[str, Query(examples=["biomass"])],
    species: Annotated[str | None, Query(max_length=20)] = None,
    life_stage: Annotated[str | None, Query(max_length=30)] = None,
    functional_group: Annotated[str | None, Query(max_length=20)] = None,
    fleet: Annotated[int | None, Query(ge=0)] = None,
    month: Month = None,
    year: Annotated[str | None, Query(pattern=r"^\d{4}$")] = None,
    format: Literal["json", "binary"] = "json",
) -> Response:
    experiment, row, index = await _ready(db, principal, experiment_id, reader)
    etag = _etag(row, request)
    if (cached := _not_modified(request, etag)) is not None:
        return cached
    scenario = await catalog.scenario_catalog(experiment.scenario_name)
    values, header = await asyncio.to_thread(
        queries.grid,
        index,
        scenario,
        _reader_for(reader, row),
        metric=metric,
        selection=queries.Selection(species, life_stage, functional_group, fleet),
        month=month,
        year=year,
    )
    headers = {"ETag": etag, "Cache-Control": IMMUTABLE}
    if format == "binary":
        head = json.dumps(header).encode()
        payload = struct.pack("<I", len(head)) + head + values.astype("<f4").tobytes()
        return Response(payload, media_type="application/octet-stream", headers=headers)
    rows = [
        [None if math.isnan(v) else round(float(v), 6) for v in line] for line in values.tolist()
    ]
    return JSONResponse({**header, "values": rows}, headers=headers)


def _filename(experiment: Experiment, suffix: str) -> str:
    slug = re.sub(r"[^A-Za-z0-9]+", "_", experiment.name).strip("_")[:60] or "experiment"
    return f"{slug}_{str(experiment.id)[:8]}.{suffix}"


@router.get(
    "/files", response_model=list[FileOut], summary="Raw files you may download", responses=ERRORS
)
async def files(
    experiment_id: uuid.UUID, principal: CurrentUser, db: Db, storage: Storage
) -> list[FileOut]:
    _, row = await _owned(db, principal, experiment_id)
    if row is None:
        return []
    out = [
        FileOut(
            file="nc",
            size_bytes=row.size_bytes,
            download_path=f"/api/v1/experiments/{experiment_id}/outputs/download?file=nc",
        )
    ]
    if principal.is_admin:
        out.append(
            FileOut(
                file="bin",
                size_bytes=await storage.size(storage.sibling(row.uri, ".bin")),
                download_path=f"/api/v1/experiments/{experiment_id}/outputs/download?file=bin",
            )
        )
    return out


async def _checked_download(
    db: Db, principal: Principal, storage: OutputStorage, experiment_id: uuid.UUID, file: str
) -> tuple[Experiment, str, int]:
    """The file's URI and size, after the role and state checks. Audited."""
    experiment, row = await _owned(db, principal, experiment_id)
    if file == "bin" and not principal.is_admin:
        raise ForbiddenError("the .bin is for admins until its format is known")
    if row is None:
        raise NotFoundError(f"no outputs: the experiment is {experiment.status.value}")
    if file == "nc" and row.state is not OutputState.READY:
        raise ConflictError(f"outputs are {row.state.value}")
    uri = row.uri if file == "nc" else storage.sibling(row.uri, ".bin")
    size = await storage.size(uri)
    if size is None:
        raise NotFoundError(f"the .{file} is not in the output storage")
    audit.record(
        db,
        actor_id=principal.user.id,
        action="outputs.downloaded",
        target_type="experiment",
        target_id=str(experiment.id),
        details={"file": file, "owner_id": str(experiment.owner_id)},
    )
    await db.commit()
    return experiment, uri, size


@router.get(
    "/download",
    status_code=status.HTTP_302_FOUND,
    summary="Redirect to the file: a presigned S3 link (1 hour by default), or nginx in local mode "
    "(audited)",
    responses={**ERRORS, 302: {"description": "To the file"}},
)
async def download(
    experiment_id: uuid.UUID,
    principal: CurrentUser,
    db: Db,
    storage: Storage,
    file: Literal["nc", "bin"] = "nc",
) -> Response:
    experiment, uri, _ = await _checked_download(db, principal, storage, experiment_id, file)
    filename = _filename(experiment, file)
    if storage.is_s3:
        return RedirectResponse(
            storage.presigned_url(uri, filename), status_code=status.HTTP_302_FOUND
        )
    return Response(
        status_code=status.HTTP_200_OK,
        headers={
            "X-Accel-Redirect": storage.nginx_location(uri),
            "Content-Disposition": f'attachment; filename="{filename}"',
        },
    )


class DownloadUrlOut(BaseModel):
    file: Literal["nc", "bin"]
    file_name: str = Field(examples=["Hake_and_sardine_to_2014_77c1e2a4.nc"])
    size_bytes: int = Field(examples=[1_612_000_000])
    url: str = Field(
        description="S3: a presigned GET link to this one object, usable without signing in. "
        "Local mode (no S3): the API download path, which needs the session",
        examples=["https://minio.dive.edito.eu/experiments/77c1e2a4.../77c1e2a4....nc?X-Amz-..."],
    )
    presigned: bool = Field(description="False in local mode")
    expires_at: datetime | None = Field(
        description="When the presigned link stops working (PRESIGNED_URL_TTL_SECONDS); null "
        "in local mode"
    )


@router.get(
    "/download-url",
    response_model=DownloadUrlOut,
    summary="A presigned S3 link to the file, as JSON (audited)",
    description=(
        "The same checks and audit entry as `/download`, but the link is returned instead of "
        "followed, so a page or a script can show, copy or hand it on. Valid for "
        "PRESIGNED_URL_TTL_SECONDS (1 hour by default); only GET of that one object."
    ),
    responses=ERRORS,
)
async def download_url(
    experiment_id: uuid.UUID,
    principal: CurrentUser,
    db: Db,
    storage: Storage,
    settings: AppSettings,
    file: Literal["nc", "bin"] = "nc",
) -> DownloadUrlOut:
    experiment, uri, size = await _checked_download(db, principal, storage, experiment_id, file)
    filename = _filename(experiment, file)
    if not storage.is_s3:
        return DownloadUrlOut(
            file=file,
            file_name=filename,
            size_bytes=size,
            url=f"/api/v1/experiments/{experiment_id}/outputs/download?file={file}",
            presigned=False,
            expires_at=None,
        )
    issued = datetime.now(UTC)
    return DownloadUrlOut(
        file=file,
        file_name=filename,
        size_bytes=size,
        url=storage.presigned_url(uri, filename),
        presigned=True,
        expires_at=issued + timedelta(seconds=settings.presigned_url_ttl_seconds),
    )


@admin_router.post(
    "/{experiment_id}/outputs/reindex",
    status_code=status.HTTP_202_ACCEPTED,
    summary="Index the outputs again (after a parser change, or a fixed file)",
    responses=ERRORS,
)
async def reindex(experiment_id: uuid.UUID, admin: AdminUser, db: Db) -> dict[str, str]:
    row = await db.get(ExperimentOutput, experiment_id)
    if row is None:
        raise NotFoundError("no outputs for this experiment")
    row.state, row.attempts, row.error = OutputState.PENDING, 0, None
    row.size_seen_at = None
    row.next_attempt_at = datetime.now(UTC)
    row.created_at = row.next_attempt_at  # OUTPUT_WAIT_MINUTES counts from now
    experiment = await db.get(Experiment, experiment_id)
    if experiment is not None and experiment.status is ExperimentStatus.FAILED:
        # It failed for its results (only finished runs have a row): copy again.
        experiment.status, experiment.error = ExperimentStatus.COPYING_RESULTS, None
        await emit(
            db,
            experiment,
            "experiment.status_changed",
            previous_status=ExperimentStatus.FAILED.value,
        )
    audit.record(
        db,
        actor_id=admin.user.id,
        action="outputs.reindex",
        target_type="experiment",
        target_id=str(experiment_id),
    )
    await db.commit()
    return {"state": row.state.value}
