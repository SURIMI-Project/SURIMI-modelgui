"""Sends queued experiments to the controller when enough Ecopath pods are
free (ADR 0015). Runs only in the worker that holds the leader lock
(ADR 0019), so two dispatchers never count the same free pods.

Pods in use are counted from the controller's own list, so runs of other
clients and pods kept by `Error` simulations count. With every pod held, the
queue waits instead of submitting runs the controller would drop silently
("No available pods", SURIMI-controller a8a7f3a).
"""

from __future__ import annotations

from datetime import UTC, datetime, timedelta

import structlog
from sqlalchemy.ext.asyncio import AsyncSession

from surimi_backend.core.config import Settings
from surimi_backend.experiments import queue as rules
from surimi_backend.experiments import repository as repo
from surimi_backend.experiments.events import emit
from surimi_backend.experiments.models import Experiment, ExperimentStatus
from surimi_backend.integrations.controller import (
    ControllerClient,
    ControllerError,
    ControllerTimeoutError,
    ControllerUnavailableError,
)
from surimi_backend.integrations.controller.mapping import to_submission

log = structlog.get_logger("surimi.queue")

# A submit whose reply was lost is retried after this; the controller answers
# "already submitted" if it has the experiment, which counts as success.
SUBMITTING_RETRY_AFTER = timedelta(minutes=2)


def _already_known(exc: ControllerError) -> bool:
    return "already submit" in exc.message.lower()


async def submit_one(db: AsyncSession, controller: ControllerClient, e: Experiment) -> None:
    """`e` is `submitting` and committed, so a crash here leaves a visible row
    that the next cycle resolves."""
    try:
        await controller.submit_experiment(to_submission(str(e.id), e.request))
    except (ControllerUnavailableError, ControllerTimeoutError) as exc:
        # Unknown whether it arrived: stays `submitting`, retried later.
        log.warning("experiment.submit_unsure", experiment_id=str(e.id), error=exc.message)
        return
    except ControllerError as exc:
        if not _already_known(exc):
            e.status = ExperimentStatus.SUBMIT_FAILED
            e.error = exc.message
            e.finished_at = datetime.now(UTC)
            await emit(
                db, e, "experiment.submit_failed", previous_status="submitting", error=exc.message
            )
            await db.commit()
            return
    e.status = ExperimentStatus.SUBMITTED
    e.submitted_at = datetime.now(UTC)
    e.last_progress_at = e.submitted_at
    await emit(db, e, "experiment.submitted", previous_status="submitting")
    await db.commit()


async def retry_submitting(db: AsyncSession, controller: ControllerClient) -> None:
    now = datetime.now(UTC)
    for e in await repo.in_flight(db):
        if e.status is ExperimentStatus.SUBMITTING and now - e.updated_at > SUBMITTING_RETRY_AFTER:
            e.submit_attempts += 1
            await db.commit()
            await submit_one(db, controller, e)


async def dispatch(db: AsyncSession, controller: ControllerClient, settings: Settings) -> int:
    """Submits what fits now. Returns how many were submitted."""
    await retry_submitting(db, controller)
    if await repo.get_setting(db, repo.QUEUE_PAUSED, default=False):
        return 0
    queued = await repo.queued(db, for_update=True)
    if not queued:
        await db.rollback()
        return 0
    try:
        statuses = await controller.get_all_simulation_statuses()
    except ControllerError as exc:
        log.warning("queue.capacity_unknown", error=exc.message)
        await db.rollback()
        return 0
    reported = {s.experiment_id for s in statuses}
    flight = await repo.in_flight(db)
    not_reported = [
        e.pods_required
        for e in flight
        if str(e.id) not in reported
        and e.status in (ExperimentStatus.SUBMITTING, ExperimentStatus.SUBMITTED)
    ]
    in_use = rules.pods_in_use([(s.experiment_id, s.status) for s in statuses], not_reported)
    free = settings.ecopath_pods - in_use
    plan = rules.plan_dispatch(
        [rules.Waiting(e.id, e.owner_id, e.pods_required, e.priority, e.queued_at) for e in queued],
        await repo.owner_pods_in_flight(db),
        free,
        max_pods_per_user=settings.max_pods_per_user,
        max_head_wait=timedelta(minutes=settings.max_head_wait_minutes),
        now=datetime.now(UTC),
    )
    log.debug(
        "queue.cycle", queued=len(queued), pods_in_use=in_use, free=free, dispatching=len(plan)
    )
    by_id = {e.id: e for e in queued}
    chosen = [by_id[w.id] for w in plan]
    for e in chosen:
        e.status = ExperimentStatus.SUBMITTING
        e.submit_attempts += 1
    await db.commit()  # releases the row locks; the rows are now `submitting`
    for e in chosen:
        log.info("experiment.dispatched", experiment_id=str(e.id), pods=e.pods_required, free=free)
        await submit_one(db, controller, e)
    return len(chosen)
