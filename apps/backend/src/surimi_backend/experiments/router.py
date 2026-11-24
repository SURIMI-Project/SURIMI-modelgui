"""`/api/v1/experiments`, `/api/v1/queue` and their admin counterparts
(docs/features/experiments, docs/features/experiment-queue)."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Annotated, Any

from fastapi import APIRouter, Depends, Path, Query, Request, status

from surimi_backend.auth.dependencies import AdminUser, AppSettings, CurrentUser, Db
from surimi_backend.catalog.router import Catalog
from surimi_backend.experiments import options, service
from surimi_backend.experiments import repository as repo
from surimi_backend.experiments.models import ExperimentStatus
from surimi_backend.experiments.schemas import (
    AdminQueueOut,
    AdoptIn,
    EventPage,
    ExperimentCloneIn,
    ExperimentDetailOut,
    ExperimentIn,
    ExperimentOptionsOut,
    ExperimentOut,
    ExperimentPage,
    ExperimentSort,
    PriorityIn,
    QueueOut,
)
from surimi_backend.initial_hcr import service as initial_hcr
from surimi_backend.initial_hcr.schemas import ExperimentInitialHcrOut
from surimi_backend.integrations.controller import ControllerClient


def get_controller(request: Request) -> ControllerClient:
    controller: ControllerClient = request.app.state.controller
    return controller


Controller = Annotated[ControllerClient, Depends(get_controller)]

ERRORS: dict[int | str, dict[str, Any]] = {
    401: {"description": "Not signed in"},
    404: {"description": "No such experiment of yours, or unknown scenario"},
    409: {"description": "Too many queued experiments, or not allowed in the current state"},
    422: {
        "description": "Not accepted by the scenario's catalog or contract; every problem is listed"
    },
}

router = APIRouter(prefix="/api/v1/experiments", tags=["Experiments"])
queue_router = APIRouter(prefix="/api/v1/queue", tags=["Experiment queue"])
admin_router = APIRouter(prefix="/api/v1/admin", tags=["Admin: experiments and queue"])
# Under /scenarios because it describes one scenario, but it is the experiment form's.
scenario_router = APIRouter(prefix="/api/v1/scenarios", tags=["Experiments"])


@router.post(
    "",
    response_model=ExperimentOut,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Queue an experiment; the worker submits it when Ecopath pods are free",
    responses=ERRORS,
)
async def submit(
    body: ExperimentIn, principal: CurrentUser, db: Db, settings: AppSettings, catalog: Catalog
) -> ExperimentOut:
    experiment = await service.create(db, settings, catalog, principal, body)
    return (await service.list_outs(db, settings, [experiment]))[0]


@router.get("", response_model=ExperimentPage, summary="Your experiments; admins see all")
async def list_experiments(
    principal: CurrentUser,
    db: Db,
    settings: AppSettings,
    status_filter: Annotated[ExperimentStatus | None, Query(alias="status")] = None,
    scenario: Annotated[str | None, Query(max_length=100)] = None,
    owner_id: Annotated[uuid.UUID | None, Query(description="Admins only")] = None,
    submitted_from: datetime | None = None,
    submitted_to: datetime | None = None,
    q: Annotated[str | None, Query(max_length=100, description="Words of the name")] = None,
    page: Annotated[int, Query(ge=1)] = 1,
    size: Annotated[int, Query(ge=1, le=200)] = 50,
    sort: ExperimentSort = "-created_at",
) -> ExperimentPage:
    filters = repo.ExperimentFilters(
        status=status_filter,
        scenario=scenario,
        owner_id=owner_id,
        submitted_from=submitted_from,
        submitted_to=submitted_to,
        q=q,
    )
    items, total = await repo.list_page(
        db,
        principal,
        filters,
        page=page,
        size=size,
        sort=sort,
    )
    return ExperimentPage(
        items=await service.list_outs(db, settings, items), total=total, page=page, size=size
    )


@router.get(
    "/{experiment_id}",
    response_model=ExperimentDetailOut,
    summary="One experiment with its simulations and newest events",
    responses=ERRORS,
)
async def get_experiment(
    experiment_id: uuid.UUID, principal: CurrentUser, db: Db, settings: AppSettings
) -> ExperimentDetailOut:
    return await service.detail(db, settings, await service.visible(db, principal, experiment_id))


@router.get(
    "/{experiment_id}/initial-hcr-data",
    response_model=ExperimentInitialHcrOut,
    summary="The controller's initial HCR data when the experiment was submitted, and each "
    "rule against its default",
    description=(
        "The snapshot the experiment points to (ADR 0028), named with today's species names, "
        "and per rule the controller's default for its entry and whether the user changed "
        "it. Owner or admin."
    ),
    responses={
        **ERRORS,
        404: {
            "description": "No such experiment of yours, or it has no snapshot (the "
            "controller did not answer when it was submitted)"
        },
    },
)
async def experiment_initial_hcr_data(
    experiment_id: uuid.UUID, principal: CurrentUser, db: Db, catalog: Catalog
) -> ExperimentInitialHcrOut:
    experiment = await service.visible(db, principal, experiment_id)
    return await initial_hcr.for_experiment(
        db,
        catalog,
        experiment.id,
        experiment.initial_hcr_snapshot_id,
        list(experiment.request.get("harvest_control_rules") or []),
    )


@router.get(
    "/{experiment_id}/events",
    response_model=EventPage,
    summary="History of one experiment, newest first",
    responses=ERRORS,
)
async def experiment_events(
    experiment_id: uuid.UUID,
    principal: CurrentUser,
    db: Db,
    page: Annotated[int, Query(ge=1)] = 1,
    size: Annotated[int, Query(ge=1, le=200)] = 50,
) -> EventPage:
    await service.visible(db, principal, experiment_id)
    events, total = await repo.events(db, experiment_id, page=page, size=size)
    return EventPage(
        items=[service.event_out(e) for e in events], total=total, page=page, size=size
    )


@router.post(
    "/{experiment_id}/cancel",
    response_model=ExperimentOut,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Cancel: at once while queued, otherwise through `cancelling`",
    responses=ERRORS,
)
async def cancel_experiment(
    experiment_id: uuid.UUID,
    principal: CurrentUser,
    db: Db,
    settings: AppSettings,
    controller: Controller,
) -> ExperimentOut:
    experiment = await service.cancel(db, controller, principal, experiment_id)
    return (await service.list_outs(db, settings, [experiment]))[0]


@router.post(
    "/{experiment_id}/clone",
    response_model=ExperimentOut,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Queue a copy, with changes; the copy is yours",
    responses=ERRORS,
)
async def clone_experiment(
    experiment_id: uuid.UUID,
    changes: ExperimentCloneIn,
    principal: CurrentUser,
    db: Db,
    settings: AppSettings,
    catalog: Catalog,
) -> ExperimentOut:
    experiment = await service.clone(db, settings, catalog, principal, experiment_id, changes)
    return (await service.list_outs(db, settings, [experiment]))[0]


@router.delete(
    "/{experiment_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Hide a finished, failed or cancelled experiment (soft delete)",
    responses=ERRORS,
)
async def delete_experiment(experiment_id: uuid.UUID, principal: CurrentUser, db: Db) -> None:
    await service.soft_delete(db, principal, experiment_id)


# --- queue ----------------------------------------------------------------------------


@queue_router.get(
    "", response_model=QueueOut, summary="Your queued experiments with position and estimate"
)
async def my_queue(
    principal: CurrentUser, db: Db, settings: AppSettings, controller: Controller
) -> QueueOut:
    return await service.queue_view(db, settings, controller, principal)


@admin_router.get(
    "/queue",
    response_model=AdminQueueOut,
    summary="The whole queue and what holds the Ecopath pods",
)
async def admin_queue(
    _: AdminUser, db: Db, settings: AppSettings, controller: Controller
) -> AdminQueueOut:
    return await service.admin_queue(db, settings, controller)


@admin_router.patch(
    "/queue/{experiment_id}",
    response_model=ExperimentOut,
    summary="Change the priority of a queued experiment (audited)",
    responses=ERRORS,
)
async def change_priority(
    experiment_id: uuid.UUID, body: PriorityIn, admin: AdminUser, db: Db, settings: AppSettings
) -> ExperimentOut:
    experiment = await service.set_priority(db, admin, experiment_id, body.priority)
    return (await service.list_outs(db, settings, [experiment]))[0]


@admin_router.post(
    "/queue/pause", status_code=status.HTTP_204_NO_CONTENT, summary="Stop dispatching (audited)"
)
async def pause_queue(admin: AdminUser, db: Db) -> None:
    await service.set_paused(db, admin, paused=True)


@admin_router.post(
    "/queue/resume", status_code=status.HTTP_204_NO_CONTENT, summary="Dispatch again (audited)"
)
async def resume_queue(admin: AdminUser, db: Db) -> None:
    await service.set_paused(db, admin, paused=False)


@admin_router.post(
    "/experiments/{experiment_id}/adopt",
    response_model=ExperimentOut,
    summary="Manage an experiment started outside this app, owned by a user (audited)",
    responses=ERRORS,
)
async def adopt_experiment(
    experiment_id: str,
    body: AdoptIn,
    admin: AdminUser,
    db: Db,
    settings: AppSettings,
    controller: Controller,
) -> ExperimentOut:
    experiment = await service.adopt(db, controller, admin, experiment_id, body.owner_id, body.name)
    return (await service.list_outs(db, settings, [experiment]))[0]


@scenario_router.get(
    "/{scenario_name}/experiment-options",
    response_model=ExperimentOptionsOut,
    summary="Everything the experiment form needs for one scenario",
    description=(
        "The contract's date range and climate scenarios, the Ecopath pods a run takes, and "
        "one row per entry that can carry a harvest control rule, with its names, functional "
        "group, your rule (or the scenario default) and the controller's initial biomass and "
        "fishing mortality. When the controller has no initial values for the scenario they "
        "are null and `notes` says why; the rest still comes."
    ),
    responses={404: {"description": "Unknown scenario"}, 502: {"description": "Controller"}},
)
async def get_experiment_options(
    scenario_name: Annotated[str, Path(pattern=r"^[A-Za-z0-9_\-]{1,100}$")],
    principal: CurrentUser,
    db: Db,
    catalog: Catalog,
    settings: AppSettings,
) -> ExperimentOptionsOut:
    return await options.experiment_options(db, catalog, settings, scenario_name, principal.user.id)
