"""SQL for experiments. Ownership is scoped here (ADR 0005): a member only
ever sees their own experiments; someone else's id is a 404, like a missing one."""

from __future__ import annotations

import re
import uuid
from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Any

from sqlalchemy import ColumnElement, Select, func, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from surimi_backend.auth.dependencies import Principal
from surimi_backend.experiments.models import (
    FINAL_STATES,
    IN_FLIGHT_STATES,
    AppSetting,
    Experiment,
    ExperimentEvent,
    ExperimentStatus,
    Simulation,
    SimulationState,
)
from surimi_backend.experiments.schemas import ExperimentSort
from surimi_backend.outputs.models import ExperimentOutput
from surimi_backend.users.models import User

QUEUE_PAUSED = "queue_paused"


def _scope(principal: Principal, statement: Select[Any]) -> Select[Any]:
    if principal.is_admin:
        return statement
    return statement.where(Experiment.owner_id == principal.user.id)


async def get_visible(
    db: AsyncSession, principal: Principal, experiment_id: uuid.UUID, *, for_update: bool = False
) -> Experiment | None:
    statement = _scope(principal, select(Experiment).where(Experiment.id == experiment_id))
    if not principal.is_admin:
        statement = statement.where(Experiment.deleted_at.is_(None))
    if for_update:
        statement = statement.with_for_update()
    found: Experiment | None = (await db.execute(statement)).scalars().first()
    return found


def _search(q: str) -> ColumnElement[bool] | None:
    """Prefix match on every word of the name, through the GIN index
    `experiments_name_fts_idx`. Only letters and digits reach to_tsquery."""
    words = [w for w in re.split(r"[^\w]+", q.lower()) if w]
    if not words:
        return None
    query = " & ".join(f"{w}:*" for w in words[:8])
    return func.to_tsvector(text("'simple'"), Experiment.name).op("@@")(
        func.to_tsquery(text("'simple'"), query)
    )


@dataclass(frozen=True, slots=True)
class ExperimentFilters:
    status: ExperimentStatus | None = None
    scenario: str | None = None
    owner_id: uuid.UUID | None = None  # admins only
    submitted_from: datetime | None = None
    submitted_to: datetime | None = None
    q: str | None = None


async def list_page(
    db: AsyncSession,
    principal: Principal,
    filters: ExperimentFilters,
    *,
    page: int,
    size: int,
    sort: ExperimentSort,
) -> tuple[list[Experiment], int]:
    status, scenario, owner_id = filters.status, filters.scenario, filters.owner_id
    submitted_from, submitted_to, q = filters.submitted_from, filters.submitted_to, filters.q
    statement = _scope(principal, select(Experiment)).where(Experiment.deleted_at.is_(None))
    if status is not None:
        statement = statement.where(Experiment.status == status)
    if scenario:
        statement = statement.where(Experiment.scenario_name == scenario)
    if owner_id is not None and principal.is_admin:
        statement = statement.where(Experiment.owner_id == owner_id)
    if submitted_from is not None:
        statement = statement.where(Experiment.created_at >= submitted_from)
    if submitted_to is not None:
        statement = statement.where(Experiment.created_at < submitted_to)
    if q and (match := _search(q)) is not None:
        statement = statement.where(match)
    total = int(await db.scalar(select(func.count()).select_from(statement.subquery())) or 0)
    column = {
        "created_at": Experiment.created_at,
        "name": Experiment.name,
        "status": Experiment.status,
    }[sort.lstrip("-")]
    ordered = statement.order_by(
        column.desc() if sort.startswith("-") else column.asc(), Experiment.id
    )
    rows = (await db.execute(ordered.offset((page - 1) * size).limit(size))).scalars()
    return list(rows), total


async def usernames(db: AsyncSession, owner_ids: set[uuid.UUID]) -> dict[uuid.UUID, str]:
    if not owner_ids:
        return {}
    rows = await db.execute(select(User.id, User.username).where(User.id.in_(owner_ids)))
    return {r[0]: r[1] for r in rows}


async def output_states(db: AsyncSession, ids: list[uuid.UUID]) -> dict[uuid.UUID, str]:
    if not ids:
        return {}
    rows = await db.execute(
        select(ExperimentOutput.experiment_id, ExperimentOutput.state).where(
            ExperimentOutput.experiment_id.in_(ids)
        )
    )
    return {r[0]: r[1].value for r in rows}


async def simulation_counts(
    db: AsyncSession, ids: list[uuid.UUID]
) -> dict[uuid.UUID, dict[str, int]]:
    """Per experiment, how many simulations are in each state (lifecycle order)."""
    if not ids:
        return {}
    rows = await db.execute(
        select(Simulation.experiment_id, Simulation.status, func.count())
        .where(Simulation.experiment_id.in_(ids))
        .group_by(Simulation.experiment_id, Simulation.status)
    )
    found: dict[uuid.UUID, dict[SimulationState, int]] = {}
    for experiment_id, state, n in rows:
        found.setdefault(experiment_id, {})[state] = n
    return {eid: {s.value: by[s] for s in SimulationState if s in by} for eid, by in found.items()}


async def simulations(db: AsyncSession, experiment_id: uuid.UUID) -> list[Simulation]:
    rows = await db.execute(
        select(Simulation)
        .where(Simulation.experiment_id == experiment_id)
        .order_by(Simulation.sim_order)
    )
    return list(rows.scalars())


async def events(
    db: AsyncSession, experiment_id: uuid.UUID, *, page: int = 1, size: int = 50
) -> tuple[list[ExperimentEvent], int]:
    base = select(ExperimentEvent).where(ExperimentEvent.experiment_id == experiment_id)
    total = int(await db.scalar(select(func.count()).select_from(base.subquery())) or 0)
    rows = await db.execute(
        base.order_by(ExperimentEvent.id.desc()).offset((page - 1) * size).limit(size)
    )
    return list(rows.scalars()), total


async def count_queued(db: AsyncSession, owner_id: uuid.UUID) -> int:
    return int(
        await db.scalar(
            select(func.count()).where(
                Experiment.owner_id == owner_id, Experiment.status == ExperimentStatus.QUEUED
            )
        )
        or 0
    )


async def queued(db: AsyncSession, *, for_update: bool = False) -> list[Experiment]:
    statement = select(Experiment).where(
        Experiment.status == ExperimentStatus.QUEUED, Experiment.deleted_at.is_(None)
    )
    if for_update:
        statement = statement.with_for_update(skip_locked=True)
    return list((await db.execute(statement)).scalars())


async def in_flight(db: AsyncSession) -> list[Experiment]:
    rows = await db.execute(select(Experiment).where(Experiment.status.in_(IN_FLIGHT_STATES)))
    return list(rows.scalars())


@dataclass(frozen=True, slots=True)
class ActiveCount:
    status: ExperimentStatus
    experiments: int
    pods: int
    stalled: int


async def active_counts(db: AsyncSession) -> list[ActiveCount]:
    """Experiments not in a final state, per status, for the worker's gauges."""
    rows = await db.execute(
        select(
            Experiment.status,
            func.count(),
            func.coalesce(func.sum(Experiment.pods_required), 0),
            func.count().filter(Experiment.stalled),
        )
        .where(Experiment.status.not_in(FINAL_STATES), Experiment.deleted_at.is_(None))
        .group_by(Experiment.status)
    )
    return [ActiveCount(r[0], int(r[1]), int(r[2]), int(r[3])) for r in rows]


async def owner_pods_in_flight(db: AsyncSession) -> dict[uuid.UUID, int]:
    rows = await db.execute(
        select(Experiment.owner_id, func.sum(Experiment.pods_required))
        .where(Experiment.status.in_(IN_FLIGHT_STATES))
        .group_by(Experiment.owner_id)
    )
    return {r[0]: int(r[1]) for r in rows}


async def median_run(db: AsyncSession, scenario: str, *, is_mse_run: bool) -> timedelta | None:
    """Median of the last 20 runs of the same scenario and kind that finished
    on the controller (copying or completed): the run time, not the copy."""
    rows = await db.execute(
        select(Experiment.started_at, Experiment.finished_at)
        .where(
            Experiment.status.in_((ExperimentStatus.COPYING_RESULTS, ExperimentStatus.COMPLETED)),
            Experiment.scenario_name == scenario,
            Experiment.is_mse_run.is_(is_mse_run),
            Experiment.started_at.is_not(None),
        )
        .order_by(Experiment.finished_at.desc())
        .limit(20)
    )
    durations: list[timedelta] = sorted(
        r[1] - r[0] for r in rows if r[0] is not None and r[1] is not None
    )
    if not durations:
        return None
    middle = len(durations) // 2
    if len(durations) % 2:
        return durations[middle]
    return (durations[middle - 1] + durations[middle]) / 2


async def get_setting(db: AsyncSession, key: str, *, default: Any) -> Any:
    row = await db.get(AppSetting, key)
    return default if row is None else row.value


async def set_setting(db: AsyncSession, key: str, value: Any, actor_id: uuid.UUID) -> None:
    row = await db.get(AppSetting, key)
    if row is None:
        db.add(AppSetting(key=key, value=value, updated_by=actor_id))
    else:
        row.value, row.updated_by = value, actor_id
