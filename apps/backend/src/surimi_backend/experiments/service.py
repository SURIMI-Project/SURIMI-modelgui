"""Experiments (docs/features/experiments): validated against the scenario
catalog and contract, then queued (ADR 0015). The worker submits them
(ADR 0019); the API never calls SubmitExperiment."""

from __future__ import annotations

import uuid
from collections import Counter, defaultdict
from datetime import UTC, datetime, timedelta
from typing import Any

import structlog
from sqlalchemy.ext.asyncio import AsyncSession

from surimi_backend.audit import service as audit
from surimi_backend.auth.dependencies import Principal
from surimi_backend.catalog.service import CatalogService
from surimi_backend.core.config import Settings
from surimi_backend.core.errors import ConflictError, InvalidInputError, NotFoundError
from surimi_backend.experiments import queue as queue_rules
from surimi_backend.experiments import repository as repo
from surimi_backend.experiments.events import emit, wake_dispatcher
from surimi_backend.experiments.models import (
    FINAL_STATES,
    Experiment,
    ExperimentEvent,
    ExperimentStatus,
    Simulation,
)
from surimi_backend.experiments.schemas import (
    AdminQueueOut,
    EventOut,
    ExperimentCloneIn,
    ExperimentDetailOut,
    ExperimentIn,
    ExperimentOut,
    InFlightOut,
    QueueOut,
    SimulationOut,
)
from surimi_backend.hcr import service as hcr
from surimi_backend.hcr.schemas import HcrIn
from surimi_backend.integrations.controller import ControllerClient, ControllerError
from surimi_backend.scheduler.derive import progress

log = structlog.get_logger("surimi.experiments")


def parse_timestamp(value: Any) -> datetime | None:
    if not value:
        return None
    return datetime.fromisoformat(str(value).replace("Z", "+00:00"))


# --- validation ---------------------------------------------------------------------


async def build_request(
    db: AsyncSession,
    catalog_service: CatalogService,
    owner_id: uuid.UUID,
    body: ExperimentIn,
) -> dict[str, Any]:
    """The request as stored, HCR biomass in kg. 404 for an unknown scenario, 422
    for anything the controller would reject late (plan 2026-11-05, R5)."""
    catalog = await catalog_service.scenario_catalog(body.scenario_name)
    contract = await catalog_service.contract(body.scenario_name)
    problems: list[str] = []

    start = parse_timestamp(contract.get("start_date_time"))
    maximum = parse_timestamp(contract.get("maximum_end_date_time"))
    end = body.end_date_time.astimezone(UTC)
    if start and end <= start:
        problems.append(f"end_date_time must be after the scenario start {start.isoformat()}")
    if maximum and end > maximum:
        problems.append(f"end_date_time must not be after {maximum.isoformat()}")

    climate = (body.climate_scenario or "").strip()
    if catalog.climate_scenarios:
        if climate not in catalog.climate_scenarios:
            problems.append(
                "climate_scenario must be one of " + ", ".join(catalog.climate_scenarios)
            )
    elif climate:
        problems.append(f"{body.scenario_name} takes no climate scenario")

    configuration: dict[str, Any] = {}
    if body.harvest_control_rules is not None and body.hcr_configuration_id is not None:
        problems.append("send harvest_control_rules or hcr_configuration_id, not both")
        rules: list[HcrIn] = []
        source = "request"
    elif body.harvest_control_rules is not None:
        source = "request"
        rules = list(body.harvest_control_rules)
    elif body.hcr_configuration_id is not None:
        source = "configuration"
        saved = await hcr.get_configuration(
            db, owner_id, body.scenario_name, body.hcr_configuration_id
        )
        configuration = {
            "hcr_configuration_id": str(saved.id),
            "hcr_configuration_name": saved.name,
        }
        rules = [HcrIn.model_validate(r) for r in saved.rules]
    else:
        source = "none"  # no rules: there are no scenario defaults (ADR 0024)
        rules = []
    sent, rule_problems = hcr.validate_rules(catalog, rules)
    if rule_problems:
        entries = hcr.eligible_entries(catalog)
        where = (
            f"; it is in your configuration {configuration['hcr_configuration_name']!r}: "
            "change it or choose another"
            if configuration
            else ""
        )
        problems += [f"{p} (eligible: {hcr.describe(entries)}){where}" for p in rule_problems]
    if problems:
        raise InvalidInputError("; ".join(problems), details={"problems": problems})
    return {
        "scenario_name": body.scenario_name,
        "end_date_time": end.isoformat(),
        "is_mse_run": body.is_mse_run,
        "climate_scenario": climate,
        "harvest_control_rules": sent,
        "harvest_control_rules_source": source,
        **configuration,
    }


# --- create, cancel, delete, clone -------------------------------------------------------


async def create(
    db: AsyncSession,
    settings: Settings,
    catalog_service: CatalogService,
    principal: Principal,
    body: ExperimentIn,
    *,
    cloned_from_id: uuid.UUID | None = None,
) -> Experiment:
    owner_id = principal.user.id
    if await repo.count_queued(db, owner_id) >= settings.max_queued_experiments_per_user:
        raise ConflictError(
            f"you already have {settings.max_queued_experiments_per_user} experiments waiting; "
            "wait for one to start or cancel one"
        )
    request = await build_request(db, catalog_service, owner_id, body)
    pods = settings.controller_mse_simulations if body.is_mse_run else 1
    if pods > settings.ecopath_pods:
        raise InvalidInputError(
            f"an MSE run needs {pods} Ecopath pods and the controller has {settings.ecopath_pods}"
        )
    experiment = Experiment(
        id=uuid.uuid4(),
        owner_id=owner_id,
        name=body.name.strip(),
        scenario_name=body.scenario_name,
        request=request,
        protocol_version=await catalog_service.protocol_version(),
        status=ExperimentStatus.QUEUED,
        is_mse_run=body.is_mse_run,
        pods_required=pods,
        priority=0,
        queued_at=datetime.now(UTC),
        cloned_from_id=cloned_from_id,
    )
    db.add(experiment)
    await db.flush()
    await emit(db, experiment, "experiment.queued", pods_required=pods)
    await wake_dispatcher(db)
    await db.commit()
    return experiment


async def visible(db: AsyncSession, principal: Principal, experiment_id: uuid.UUID) -> Experiment:
    experiment = await repo.get_visible(db, principal, experiment_id)
    if experiment is None:
        raise NotFoundError("no such experiment")
    return experiment


def _audit_if_others(
    db: AsyncSession, principal: Principal, experiment: Experiment, action: str
) -> None:
    if experiment.owner_id != principal.user.id:
        audit.record(
            db,
            actor_id=principal.user.id,
            action=action,
            target_type="experiment",
            target_id=str(experiment.id),
            details={"owner_id": str(experiment.owner_id), "name": experiment.name},
        )


async def cancel(
    db: AsyncSession, controller: ControllerClient, principal: Principal, experiment_id: uuid.UUID
) -> Experiment:
    experiment = await repo.get_visible(db, principal, experiment_id, for_update=True)
    if experiment is None:
        raise NotFoundError("no such experiment")
    if experiment.status in FINAL_STATES:
        raise ConflictError(f"the experiment is already {experiment.status.value}")
    if experiment.status is ExperimentStatus.COPYING_RESULTS:
        raise ConflictError("the run has finished; its results are being copied")
    if experiment.status is ExperimentStatus.CANCELLING:
        return experiment
    previous = experiment.status.value
    now = datetime.now(UTC)
    experiment.cancel_requested_at = now
    _audit_if_others(db, principal, experiment, "experiment.cancelled")
    if experiment.status is ExperimentStatus.QUEUED:
        # Nothing exists on the controller yet.
        experiment.status = ExperimentStatus.CANCELLED
        experiment.finished_at = now
        await emit(db, experiment, "experiment.cancelled", previous_status=previous)
        await wake_dispatcher(db)
        await db.commit()
        return experiment
    experiment.status = ExperimentStatus.CANCELLING
    await emit(db, experiment, "experiment.status_changed", previous_status=previous)
    await db.commit()
    # Best effort now; the worker repeats it until the simulations are stopped,
    # because RemoveExperiment only stops Running ones (controller a8a7f3a).
    try:
        await controller.remove_experiment(str(experiment.id))
    except ControllerError as exc:
        log.info("experiment.cancel_deferred", experiment_id=str(experiment.id), error=exc.message)
    return experiment


async def soft_delete(db: AsyncSession, principal: Principal, experiment_id: uuid.UUID) -> None:
    experiment = await repo.get_visible(db, principal, experiment_id, for_update=True)
    if experiment is None or experiment.deleted_at is not None:
        raise NotFoundError("no such experiment")
    if experiment.status not in FINAL_STATES:
        raise ConflictError(f"the experiment is {experiment.status.value}; cancel it first")
    experiment.deleted_at = datetime.now(UTC)
    _audit_if_others(db, principal, experiment, "experiment.deleted")
    await db.commit()


async def clone(
    db: AsyncSession,
    settings: Settings,
    catalog_service: CatalogService,
    principal: Principal,
    experiment_id: uuid.UUID,
    changes: ExperimentCloneIn,
) -> Experiment:
    """A new experiment owned by the caller, from the original's stored
    request with `changes` applied. The copy is validated again."""
    original = await visible(db, principal, experiment_id)
    request = original.request
    stored_rules = [HcrIn.model_validate(r) for r in request.get("harvest_control_rules", [])]
    body = ExperimentIn(
        name=changes.name or f"{original.name} (copy)"[:200],
        scenario_name=original.scenario_name,
        end_date_time=changes.end_date_time or datetime.fromisoformat(request["end_date_time"]),
        is_mse_run=original.is_mse_run if changes.is_mse_run is None else changes.is_mse_run,
        climate_scenario=changes.climate_scenario
        if changes.climate_scenario is not None
        else request.get("climate_scenario") or None,
        harvest_control_rules=changes.harvest_control_rules
        if changes.harvest_control_rules is not None
        else stored_rules,
    )
    return await create(db, settings, catalog_service, principal, body, cloned_from_id=original.id)


# --- views -------------------------------------------------------------------------------


def to_out(
    e: Experiment,
    *,
    username: str | None = None,
    outputs_state: str | None = None,
    position: int | None = None,
    estimated: datetime | None = None,
    simulation_counts: dict[str, int] | None = None,
) -> ExperimentOut:
    return ExperimentOut(
        id=e.id,
        name=e.name,
        scenario_name=e.scenario_name,
        owner_id=e.owner_id,
        owner_username=username,
        status=e.status,
        controller_status_raw=e.controller_status_raw,
        is_mse_run=e.is_mse_run,
        pods_required=e.pods_required,
        simulation_counts=simulation_counts or {},
        priority=e.priority,
        queue_position=position,
        estimated_start_at=estimated,
        progress=e.progress,
        stalled=e.stalled,
        stalled_reason=e.stalled_reason,
        error=e.error,
        end_date_time=e.request.get("end_date_time"),
        climate_scenario=e.request.get("climate_scenario") or None,
        outputs_state=outputs_state,
        cloned_from_id=e.cloned_from_id,
        created_at=e.created_at,
        queued_at=e.queued_at,
        submitted_at=e.submitted_at,
        started_at=e.started_at,
        finished_at=e.finished_at,
        completed_at=e.completed_at,
        cancel_requested_at=e.cancel_requested_at,
    )


def event_out(ev: ExperimentEvent) -> EventOut:
    return EventOut(id=ev.id, type=ev.type, data=ev.data, at=ev.at)


def simulation_out(s: Simulation) -> SimulationOut:
    return SimulationOut(
        id=s.id,
        order=s.sim_order,
        status=s.status,
        status_raw=s.status_raw,
        progress=progress([(s.start_date_time, s.end_date_time, s.simulation_current, s.status)])
        or 0.0,
        start_date_time=s.start_date_time,
        end_date_time=s.end_date_time,
        simulation_current=s.simulation_current,
        simulation_started=s.simulation_started,
        duration=s.duration,
        ecology_host=s.ecology_host,
        status_since=s.status_since,
    )


async def positions(
    db: AsyncSession, settings: Settings
) -> list[tuple[Experiment, int, datetime | None]]:
    """Every queued experiment in dispatch order, with position and estimate."""
    waiting = await repo.queued(db)
    owner_pods = await repo.owner_pods_in_flight(db)
    by_id = {e.id: e for e in waiting}
    order = queue_rules.fair_order(
        [
            queue_rules.Waiting(e.id, e.owner_id, e.pods_required, e.priority, e.queued_at)
            for e in waiting
        ],
        owner_pods,
    )
    in_use = sum(owner_pods.values())
    out: list[tuple[Experiment, int, datetime | None]] = []
    ahead = in_use
    now = datetime.now(UTC)
    medians: dict[tuple[str, bool], timedelta | None] = {}
    for index, w in enumerate(order, start=1):
        e = by_id[w.id]
        key = (e.scenario_name, e.is_mse_run)
        if key not in medians:
            medians[key] = await repo.median_run(db, key[0], is_mse_run=key[1])
        estimate = queue_rules.estimated_start(
            ahead, e.pods_required, settings.ecopath_pods, medians[key], now
        )
        out.append((e, index, estimate))
        ahead += e.pods_required
    return out


async def list_outs(
    db: AsyncSession, settings: Settings, experiments: list[Experiment]
) -> list[ExperimentOut]:
    names = await repo.usernames(db, {e.owner_id for e in experiments})
    states = await repo.output_states(db, [e.id for e in experiments])
    sim_counts = await repo.simulation_counts(db, [e.id for e in experiments])
    queued_info: dict[uuid.UUID, tuple[int, datetime | None]] = {}
    if any(e.status is ExperimentStatus.QUEUED for e in experiments):
        queued_info = {e.id: (pos, est) for e, pos, est in await positions(db, settings)}
    return [
        to_out(
            e,
            username=names.get(e.owner_id),
            outputs_state=states.get(e.id),
            position=queued_info.get(e.id, (None, None))[0],
            estimated=queued_info.get(e.id, (None, None))[1],
            simulation_counts=sim_counts.get(e.id),
        )
        for e in experiments
    ]


async def detail(db: AsyncSession, settings: Settings, e: Experiment) -> ExperimentDetailOut:
    base = (await list_outs(db, settings, [e]))[0]
    events, _ = await repo.events(db, e.id, size=50)
    return ExperimentDetailOut(
        **base.model_dump(),
        request=e.request,
        protocol_version=e.protocol_version,
        simulations=[simulation_out(s) for s in await repo.simulations(db, e.id)],
        events=[event_out(ev) for ev in events],
    )


async def queue_view(
    db: AsyncSession, settings: Settings, controller: ControllerClient, principal: Principal
) -> QueueOut:
    ordered = await positions(db, settings)
    mine = [(e, p, est) for e, p, est in ordered if e.owner_id == principal.user.id]
    in_use, _, _ = await controller_pods(db, controller)
    return QueueOut(
        paused=bool(await repo.get_setting(db, repo.QUEUE_PAUSED, default=False)),
        pods_total=settings.ecopath_pods,
        pods_in_use=in_use,
        queued_total=len(ordered),
        items=[
            to_out(e, username=principal.user.username, position=p, estimated=est)
            for e, p, est in mine
        ],
    )


async def controller_pods(
    db: AsyncSession, controller: ControllerClient
) -> tuple[int | None, list[InFlightOut], str | None]:
    """Pods in use as the dispatcher counts them (ADR 0015), and what holds them."""
    try:
        statuses = await controller.get_all_simulation_statuses()
    except ControllerError as exc:
        return None, [], exc.message
    ours = {e.id: e for e in await repo.in_flight(db)}
    names = await repo.usernames(db, {e.owner_id for e in ours.values()})
    grouped: dict[str, Counter[str]] = defaultdict(Counter)
    scenario: dict[str, str] = {}
    for s in statuses:
        grouped[s.experiment_id][s.status] += 1
        scenario[s.experiment_id] = s.scenario_name
    rows: list[InFlightOut] = []
    reported: set[str] = set()
    for eid, counts in grouped.items():
        held = sum(n for st, n in counts.items() if st not in queue_rules.POD_FREE_STATUSES)
        if held == 0:
            continue
        reported.add(eid)
        try:
            ours_e = ours.get(uuid.UUID(eid))
        except ValueError:
            ours_e = None
        rows.append(
            InFlightOut(
                experiment_id=eid,
                managed=ours_e is not None,
                owner_username=names.get(ours_e.owner_id) if ours_e else None,
                name=ours_e.name if ours_e else None,
                scenario_name=scenario[eid],
                pods=held,
                statuses=dict(counts),
                leaked=counts.get("Error", 0) > 0,
                stalled=bool(ours_e and ours_e.stalled),
            )
        )
    not_reported = [
        e
        for e in ours.values()
        if str(e.id) not in grouped
        and e.status in (ExperimentStatus.SUBMITTING, ExperimentStatus.SUBMITTED)
    ]
    for e in not_reported:
        rows.append(
            InFlightOut(
                experiment_id=str(e.id),
                managed=True,
                owner_username=names.get(e.owner_id),
                name=e.name,
                scenario_name=e.scenario_name,
                pods=e.pods_required,
                statuses={},
                leaked=False,
                stalled=e.stalled,
            )
        )
    total = queue_rules.pods_in_use(
        [(s.experiment_id, s.status) for s in statuses], [e.pods_required for e in not_reported]
    )
    return total, rows, None


async def admin_queue(
    db: AsyncSession, settings: Settings, controller: ControllerClient
) -> AdminQueueOut:
    ordered = await positions(db, settings)
    names = await repo.usernames(db, {e.owner_id for e, _, _ in ordered})
    in_use, rows, error = await controller_pods(db, controller)
    return AdminQueueOut(
        paused=bool(await repo.get_setting(db, repo.QUEUE_PAUSED, default=False)),
        pods_total=settings.ecopath_pods,
        pods_in_use=in_use,
        pods_free=None if in_use is None else max(settings.ecopath_pods - in_use, 0),
        queued=[
            to_out(e, username=names.get(e.owner_id), position=p, estimated=est)
            for e, p, est in ordered
        ],
        in_flight=rows,
        controller_error=error,
    )


async def set_priority(
    db: AsyncSession, principal: Principal, experiment_id: uuid.UUID, priority: int
) -> Experiment:
    experiment = await visible(db, principal, experiment_id)
    if experiment.status is not ExperimentStatus.QUEUED:
        raise ConflictError("only a queued experiment has a priority to change")
    old = experiment.priority
    experiment.priority = priority
    audit.record(
        db,
        actor_id=principal.user.id,
        action="queue.priority_changed",
        target_type="experiment",
        target_id=str(experiment.id),
        details={"from": old, "to": priority},
    )
    await wake_dispatcher(db)
    await db.commit()
    return experiment


async def set_paused(db: AsyncSession, principal: Principal, *, paused: bool) -> None:
    await repo.set_setting(db, repo.QUEUE_PAUSED, paused, principal.user.id)
    audit.record(
        db,
        actor_id=principal.user.id,
        action="queue.paused" if paused else "queue.resumed",
        target_type="queue",
        target_id="experiments",
    )
    await wake_dispatcher(db)
    await db.commit()


async def adopt(
    db: AsyncSession,
    controller: ControllerClient,
    principal: Principal,
    experiment_id: str,
    owner_id: uuid.UUID,
    name: str | None,
) -> Experiment:
    """Takes an experiment started outside this app (Bruno, other tools) into
    our table, owned by `owner_id`, so the worker follows it. Its inputs are
    unknown, so it cannot be cloned."""
    try:
        eid = uuid.UUID(experiment_id)
    except ValueError as exc:
        raise InvalidInputError("only experiments whose id is a UUID can be adopted") from exc
    if await db.get(Experiment, eid) is not None:
        raise ConflictError("this experiment is already managed here")
    if await repo.usernames(db, {owner_id}) == {}:
        raise NotFoundError("no such owner")
    statuses = await controller.get_simulation_statuses([experiment_id])
    if not statuses:
        raise NotFoundError("the controller does not know this experiment")
    first = statuses[0]
    experiment = Experiment(
        id=eid,
        owner_id=owner_id,
        name=name or f"Adopted {experiment_id[:8]}",
        scenario_name=first.scenario_name,
        request={
            "adopted": True,
            "scenario_name": first.scenario_name,
            "end_date_time": first.end_date_time.isoformat() if first.end_date_time else None,
        },
        protocol_version="unknown",
        status=ExperimentStatus.SUBMITTED,
        is_mse_run=len(statuses) > 1,
        pods_required=len(statuses),
        submitted_at=first.simulation_started or datetime.now(UTC),
    )
    db.add(experiment)
    await db.flush()
    audit.record(
        db,
        actor_id=principal.user.id,
        action="experiment.adopted",
        target_type="experiment",
        target_id=experiment_id,
        details={"owner_id": str(owner_id)},
    )
    await emit(db, experiment, "experiment.adopted")
    await db.commit()
    return experiment
