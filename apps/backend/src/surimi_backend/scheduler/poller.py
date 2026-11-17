"""Keeps our experiments in step with the controller
(docs/features/simulation-status-scheduler).

What the controller does, and how it is handled here (SURIMI-controller
`a8a7f3a`, read 2026-11-06):

- `SubmitExperiment` returns before any simulation exists. When no Ecopath pod
  is free, the simulation is **never created**: the controller logs "No
  available pods" and reports nothing for the experiment. So an experiment
  with no simulation after START_TIMEOUT never started → `failed`.
- If some simulations of an MSE run got a pod and others did not, the ones
  created stay `Initialising` for ever and hold their pods → `failed` after
  START_TIMEOUT, saying so.
- A known experiment the controller stops reporting (restart) → `failed`
  (lost) after LOST_AFTER_POLLS polls.
- `RemoveExperiment` stops only `Running` simulations, so a cancel is repeated
  until nothing runs, for at most CANCEL_TIMEOUT.
- The simulations of one experiment (5 for an MSE run) initialise in parallel
  and all start running together once every one is `Initialised`
  (SURIMI-controller `117e604`, `ExperimentManager.RunExperimentAsync`). Each
  simulation's change is an event of its own (`simulation.status_changed`).
"""

from __future__ import annotations

import uuid
from collections import defaultdict
from datetime import UTC, datetime, timedelta

import structlog
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from surimi_backend.core.config import Settings
from surimi_backend.experiments.events import emit
from surimi_backend.experiments.models import (
    FINAL_STATES,
    POLLED_STATES,
    Experiment,
    ExperimentStatus,
    Simulation,
    SimulationState,
)
from surimi_backend.integrations.controller import (
    ControllerClient,
    ControllerError,
    SimulationStatus,
)
from surimi_backend.outputs.models import ExperimentOutput
from surimi_backend.outputs.storage import output_uri
from surimi_backend.scheduler.derive import counts, derive, map_status, progress

log = structlog.get_logger("surimi.scheduler")

BATCH = 100
_warned_unknown: set[str] = set()

NEVER_STARTED = (
    "the controller never started this experiment: no simulation appeared within {minutes} min. "
    "Usually no Ecopath pod was free (controller log: 'No available pods'), or initialisation "
    "failed before any simulation was created"
)
PARTIAL_START = (
    "only {got} of {wanted} simulations started within {minutes} min (probably no free Ecopath "
    "pod for the others); the started ones cannot run and keep their pods until the controller "
    "restarts"
)
LOST = "lost: the controller no longer knows this experiment (restarted?)"


async def poll(db: AsyncSession, controller: ControllerClient, settings: Settings) -> int:
    """One poll of every experiment in flight. Returns how many changed state."""
    experiments = list(
        (
            await db.execute(
                select(Experiment).where(
                    Experiment.status.in_(POLLED_STATES), Experiment.deleted_at.is_(None)
                )
            )
        ).scalars()
    )
    if not experiments:
        return 0
    reported: dict[str, list[SimulationStatus]] = defaultdict(list)
    ids = [str(e.id) for e in experiments]
    try:
        for i in range(0, len(ids), BATCH):
            for s in await controller.get_simulation_statuses(ids[i : i + BATCH]):
                reported[s.experiment_id].append(s)
    except ControllerError as exc:
        # A failed poll changes nothing; the next one repeats it (ADR 0019).
        log.warning("scheduler.poll_failed", error=exc.message, experiments=len(ids))
        return 0
    changed = 0
    now = datetime.now(UTC)
    for experiment in experiments:
        if await update_experiment(
            db, controller, settings, experiment, reported.get(str(experiment.id), []), now
        ):
            changed += 1
    await db.commit()
    return changed


async def _known_simulations(
    db: AsyncSession, experiment_id: uuid.UUID
) -> dict[uuid.UUID, Simulation]:
    rows = await db.execute(select(Simulation).where(Simulation.experiment_id == experiment_id))
    return {s.id: s for s in rows.scalars()}


async def update_experiment(
    db: AsyncSession,
    controller: ControllerClient,
    settings: Settings,
    e: Experiment,
    statuses: list[SimulationStatus],
    now: datetime,
) -> bool:
    previous = e.status
    was_stalled = e.stalled
    known = await _known_simulations(db, e.id)
    if not statuses:
        await _not_reported(db, settings, e, known=bool(known), now=now)
        return e.status is not previous

    e.missing_polls = 0
    sims, moved = _upsert(db, e, statuses, known, now)
    e.controller_status_raw = ", ".join(sorted({s.status_raw for s in sims}))
    if await _incomplete_start(db, settings, e, sims, now):
        return True

    new_progress = progress(
        (s.start_date_time, s.end_date_time, s.simulation_current, s.status) for s in sims
    )
    if new_progress != e.progress:
        e.progress = new_progress
        e.last_progress_at = now

    derived = derive([s.status for s in sims])
    if e.status is ExperimentStatus.CANCELLING:
        await _cancelling(db, controller, settings, e, sims, derived, now)
    elif derived is not None and derived is not e.status:
        await _move(db, settings, e, derived, now)

    if e.status in POLLED_STATES:
        _flag_stalls(e, sims, settings, now)
    by_state = counts(s.status for s in sims)
    for sim, before in moved:
        await emit(
            db,
            e,
            "simulation.status_changed",
            simulation={
                "id": str(sim.id),
                "order": sim.sim_order,
                "status": sim.status.value,
                "status_raw": sim.status_raw,
                "previous_status": before.value if before else None,
            },
            simulations=by_state,
        )
    if e.status is not previous and e.status not in FINAL_STATES:
        await emit(
            db, e, "experiment.status_changed", previous_status=previous.value, simulations=by_state
        )
    if e.stalled and not was_stalled:
        await emit(db, e, "experiment.stalled", reason=e.stalled_reason)
    return e.status is not previous


async def _not_reported(
    db: AsyncSession, settings: Settings, e: Experiment, *, known: bool, now: datetime
) -> None:
    """The controller reports nothing for `e`: lost if it knew it before,
    never started if it never did (no free pod, or init failed early)."""
    if known:
        e.missing_polls += 1
        if e.missing_polls >= settings.lost_after_polls:
            await _finish(db, settings, e, ExperimentStatus.FAILED, now, error=LOST)
    elif e.status is ExperimentStatus.CANCELLING:
        await _finish(db, settings, e, ExperimentStatus.CANCELLED, now)
    elif now - (e.submitted_at or e.queued_at) > timedelta(minutes=settings.start_timeout_minutes):
        error = NEVER_STARTED.format(minutes=settings.start_timeout_minutes)
        await _finish(db, settings, e, ExperimentStatus.FAILED, now, error=error)


async def _incomplete_start(
    db: AsyncSession, settings: Settings, e: Experiment, sims: list[Simulation], now: datetime
) -> bool:
    """Fewer simulations than pods_required: failed when they all still
    initialise after START_TIMEOUT (the rest got no pod); otherwise the real
    count wins (a changed NR_OF_MSE_RUNS corrects itself, ADR 0015)."""
    if len(sims) == e.pods_required:
        return False
    waiting = all(
        s.status in (SimulationState.INITIALISING, SimulationState.INITIALISED) for s in sims
    )
    late = now - (e.submitted_at or e.queued_at) > timedelta(minutes=settings.start_timeout_minutes)
    if len(sims) < e.pods_required and waiting and late:
        if e.status is ExperimentStatus.CANCELLING:
            await _finish(db, settings, e, ExperimentStatus.CANCELLED, now)
        else:
            error = PARTIAL_START.format(
                got=len(sims), wanted=e.pods_required, minutes=settings.start_timeout_minutes
            )
            await _finish(db, settings, e, ExperimentStatus.FAILED, now, error=error)
        return True
    if not waiting:
        log.warning(
            "scheduler.simulation_count",
            experiment_id=str(e.id),
            expected=e.pods_required,
            reported=len(sims),
        )
        e.pods_required = len(sims)
    return False


async def _move(
    db: AsyncSession, settings: Settings, e: Experiment, derived: ExperimentStatus, now: datetime
) -> None:
    if derived is ExperimentStatus.COPYING_RESULTS:
        await _run_finished(db, settings, e, now)
        return
    if derived in FINAL_STATES:
        error = None
        if derived is ExperimentStatus.FAILED:
            error = (
                "the controller reported Error for a simulation; it keeps its Ecopath pod "
                "until the controller restarts"
            )
        await _finish(db, settings, e, derived, now, error=error)
        return
    e.status = derived
    if derived is ExperimentStatus.RUNNING and e.started_at is None:
        e.started_at = now
    e.last_progress_at = now


def _upsert(
    db: AsyncSession,
    e: Experiment,
    statuses: list[SimulationStatus],
    known: dict[uuid.UUID, Simulation],
    now: datetime,
) -> tuple[list[Simulation], list[tuple[Simulation, SimulationState | None]]]:
    """Store what the controller reports. Returns the simulations, and those
    first seen or whose state changed, with the state they had before."""
    sims: list[Simulation] = []
    moved: list[tuple[Simulation, SimulationState | None]] = []
    orders = {s.order for s in statuses}
    for index, status in enumerate(sorted(statuses, key=lambda s: s.order), start=1):
        try:
            sid = uuid.UUID(status.simulation_id)
        except ValueError:
            sid = uuid.uuid5(e.id, status.simulation_id)
        state = map_status(status.status)
        if state is SimulationState.UNKNOWN and status.status not in _warned_unknown:
            _warned_unknown.add(status.status)
            log.warning("scheduler.unknown_status", status=status.status)
        sim = known.get(sid)
        if sim is None:
            sim = Simulation(
                id=sid,
                experiment_id=e.id,
                # Controller orders are global counters; fall back to our own if they repeat.
                sim_order=status.order if len(orders) == len(statuses) else index,
                status=state,
                status_raw=status.status,
                first_seen_at=now,
                status_since=now,
            )
            db.add(sim)
            moved.append((sim, None))
        elif sim.status is not state:
            moved.append((sim, sim.status))
            sim.status, sim.status_since = state, now
        sim.status_raw = status.status
        sim.start_date_time = status.start_date_time
        sim.end_date_time = status.end_date_time
        sim.simulation_started = status.simulation_started
        sim.simulation_current = status.simulation_current
        sim.duration = status.simulation_duration
        sim.ecology_host = status.ecology_host or None
        sim.last_seen_at = now
        sims.append(sim)
    return sims, moved


async def _cancelling(
    db: AsyncSession,
    controller: ControllerClient,
    settings: Settings,
    e: Experiment,
    sims: list[Simulation],
    derived: ExperimentStatus | None,
    now: datetime,
) -> None:
    states = {s.status for s in sims}
    if SimulationState.RUNNING in states:
        try:
            await controller.remove_experiment(str(e.id))
        except ControllerError as exc:
            log.info("scheduler.cancel_retry_failed", experiment_id=str(e.id), error=exc.message)
        return
    waiting = states & {SimulationState.INITIALISING, SimulationState.INITIALISED}
    if not waiting:
        # Nothing runs any more: cancelled if anything was, else what it ended as.
        final = (
            ExperimentStatus.CANCELLED
            if SimulationState.CANCELLED in states or derived is None
            else derived
        )
        if final is ExperimentStatus.COPYING_RESULTS:  # it finished before the cancel
            await _run_finished(db, settings, e, now)
        else:
            await _finish(db, settings, e, final, now)
        return
    asked = e.cancel_requested_at or now
    if now - asked > timedelta(minutes=settings.cancel_timeout_minutes) and not e.stalled:
        e.stalled = True
        e.stalled_reason = (
            "cancel not possible while simulations are "
            + ", ".join(sorted(s.value for s in waiting))
            + ": the controller only cancels Running simulations"
        )


def _flag_stalls(e: Experiment, sims: list[Simulation], settings: Settings, now: datetime) -> None:
    if e.status is ExperimentStatus.CANCELLING and e.stalled:
        return
    init_limit = timedelta(minutes=settings.init_timeout_minutes)
    stuck = [
        s
        for s in sims
        if s.status in (SimulationState.INITIALISING, SimulationState.INITIALISED)
        and now - s.status_since > init_limit
    ]
    reason: str | None = None
    if stuck:
        waiting = ", ".join(f"{n} {state}" for state, n in counts(s.status for s in stuck).items())
        reason = (
            f"{len(stuck)} of {len(sims)} simulation(s) not running after "
            f"{settings.init_timeout_minutes} min ({waiting}): initialisation failed, or no "
            "Ecopath pod; the controller will not report Error"
        )
    elif e.last_progress_at and now - e.last_progress_at > timedelta(
        minutes=settings.stall_after_minutes
    ):
        reason = f"no progress for {settings.stall_after_minutes} min"
    e.stalled = reason is not None
    e.stalled_reason = reason


async def _run_finished(db: AsyncSession, settings: Settings, e: Experiment, now: datetime) -> None:
    """Every simulation is Finished: the experiment waits for its results in
    the bucket (`copying_results`); the outputs job moves it to `completed`.
    The caller emits the status change."""
    e.status = ExperimentStatus.COPYING_RESULTS
    e.finished_at = now
    e.progress = 1.0
    e.stalled = False
    e.stalled_reason = None
    if await db.get(ExperimentOutput, e.id) is None:
        db.add(
            ExperimentOutput(
                experiment_id=e.id, uri=output_uri(settings, e.id), next_attempt_at=now
            )
        )


async def _finish(
    db: AsyncSession,
    settings: Settings,
    e: Experiment,
    status: ExperimentStatus,
    now: datetime,
    *,
    error: str | None = None,
) -> None:
    previous = e.status
    e.status = status
    e.finished_at = now
    e.stalled = False
    e.stalled_reason = None
    if error:
        e.error = error
    event = (
        "experiment.cancelled"
        if status is ExperimentStatus.CANCELLED
        else "experiment.status_changed"
    )
    await emit(db, e, event, previous_status=previous.value, error=error)
