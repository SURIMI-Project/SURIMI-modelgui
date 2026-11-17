"""Experiment events: a row in `experiment_events`, read by clients polling
`GET /api/v1/events?after=<id>` (ADR 0021)."""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

import structlog
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from surimi_backend.experiments.models import FINAL_STATES, Experiment, ExperimentEvent
from surimi_backend.observability import metrics

log = structlog.get_logger("surimi.experiments")

# The API wakes the worker's dispatcher with this (ADR 0019).
DISPATCH_CHANNEL = "surimi_dispatch"


async def emit(
    db: AsyncSession,
    experiment: Experiment,
    event_type: str,
    *,
    previous_status: str | None = None,
    **extra: Any,
) -> ExperimentEvent:
    data: dict[str, Any] = {
        "experiment_id": str(experiment.id),
        "name": experiment.name,
        "scenario_name": experiment.scenario_name,
        "status": experiment.status.value,
        "previous_status": previous_status,
        "at": datetime.now(UTC).isoformat(),
        **extra,
    }
    event = ExperimentEvent(
        experiment_id=experiment.id, owner_id=experiment.owner_id, type=event_type, data=data
    )
    db.add(event)
    await db.flush()
    _count(experiment, event_type, previous_status)
    log.info(
        event_type,
        experiment_id=str(experiment.id),
        status=experiment.status.value,
        previous_status=previous_status,
    )
    return event


# The events that carry a status change, each with its previous status. Others
# (simulation.status_changed, experiment.outputs_ready, ...) can be emitted for
# an experiment already in a final state and must not count it again.
_STATUS_EVENTS = frozenset(
    {"experiment.status_changed", "experiment.cancelled", "experiment.submit_failed"}
)


def _count(experiment: Experiment, event_type: str, previous_status: str | None) -> None:
    """Every status change goes through `emit`, so the counters are moved here."""
    scenario = experiment.scenario_name
    status = experiment.status
    if event_type == "experiment.queued":
        metrics.EXPERIMENTS_SUBMITTED.labels(scenario).inc()
    elif (
        event_type in _STATUS_EVENTS
        and status in FINAL_STATES
        and previous_status not in (None, status.value)
    ):
        metrics.EXPERIMENTS_ENDED.labels(scenario, status.value).inc()


async def wake_dispatcher(db: AsyncSession) -> None:
    """Delivered when the caller commits."""
    await db.execute(text("SELECT pg_notify(:channel, '')"), {"channel": DISPATCH_CHANNEL})
