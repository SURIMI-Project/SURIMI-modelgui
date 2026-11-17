"""Experiment events: a row in `experiment_events`, read by clients polling
`GET /api/v1/events?after=<id>` (ADR 0021)."""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

import structlog
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from surimi_backend.experiments.models import Experiment, ExperimentEvent

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
    log.info(
        event_type,
        experiment_id=str(experiment.id),
        status=experiment.status.value,
        previous_status=previous_status,
    )
    return event


async def wake_dispatcher(db: AsyncSession) -> None:
    """Delivered when the caller commits."""
    await db.execute(text("SELECT pg_notify(:channel, '')"), {"channel": DISPATCH_CHANNEL})
