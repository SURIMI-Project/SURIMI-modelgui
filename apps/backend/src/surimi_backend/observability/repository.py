"""SQL for the activity statistics (docs/features/observability-and-activity
§ Activity statistics; indexes in docs/database/README.md § Indexing).

Computed at request time: about 100 users and 110,000 sign-ins a year make
these queries fast without summary tables. Sign-ins older than
RETENTION_LOGIN_EVENTS_DAYS exist only as months in `login_stats_monthly`, so
every sign-in count adds the roll-up months in the period to the raw rows; a
row is in one or the other, never both. Soft-deleted experiments count: they
record what the user did.
"""

from __future__ import annotations

import uuid
from collections.abc import Sequence
from dataclasses import dataclass
from datetime import UTC, date, datetime, time, timedelta
from typing import Any

from sqlalchemy import (
    ColumnElement,
    Select,
    and_,
    distinct,
    func,
    literal,
    select,
    true,
    union,
)
from sqlalchemy.dialects.postgresql import distinct_on
from sqlalchemy.ext.asyncio import AsyncSession

from surimi_backend.auth.models import LoginEvent, LoginMethod, LoginResult, LoginStatsMonthly
from surimi_backend.experiments.models import FINAL_STATES, Experiment, ExperimentStatus
from surimi_backend.observability.schemas import UserStatsSort
from surimi_backend.users import repository as users_repository
from surimi_backend.users.models import Role, User

RECENT = 20
FAILED_STATES = (ExperimentStatus.FAILED, ExperimentStatus.SUBMIT_FAILED)
EXPERIMENT_FIELDS = (
    "experiments_submitted",
    "experiments_completed",
    "experiments_failed",
    "experiments_cancelled",
    "experiments_active",
)


@dataclass(frozen=True, slots=True)
class Window:
    """[start, end); None = open on that side."""

    start: datetime | None = None
    end: datetime | None = None

    def within(self, column: Any) -> ColumnElement[bool]:
        conditions: list[ColumnElement[bool]] = [column.is_not(None)]
        if self.start is not None:
            conditions.append(column >= self.start)
        if self.end is not None:
            conditions.append(column < self.end)
        return and_(*conditions)

    def months(self) -> ColumnElement[bool]:
        """Roll-up months (their first day, UTC) that overlap the window: the
        month of `start` onwards, and months that begin before `end`."""
        month = LoginStatsMonthly.month
        conditions: list[ColumnElement[bool]] = [true()]
        if self.start is not None:
            start = self.start.astimezone(UTC)
            conditions.append(month >= date(start.year, start.month, 1))
        if self.end is not None:
            end = self.end.astimezone(UTC)
            # A month starts at 00:00 of its first day: it begins before `end`
            # if its first day is before end's day, or is that day and end is later.
            first_day_after = end.date() if end.time() == time() else end.date() + timedelta(1)
            conditions.append(month < first_day_after)
        return and_(*conditions)


def _experiment_columns(window: Window) -> list[Any]:
    ended = window.within(Experiment.finished_at)
    completed = and_(Experiment.status == ExperimentStatus.COMPLETED, ended)
    run_seconds = func.extract("epoch", Experiment.finished_at - Experiment.submitted_at)
    return [
        func.count().filter(window.within(Experiment.queued_at)).label("experiments_submitted"),
        func.count().filter(completed).label("experiments_completed"),
        func.count()
        .filter(and_(Experiment.status.in_(FAILED_STATES), ended))
        .label("experiments_failed"),
        func.count()
        .filter(and_(Experiment.status == ExperimentStatus.CANCELLED, ended))
        .label("experiments_cancelled"),
        func.count().filter(Experiment.status.not_in(FINAL_STATES)).label("experiments_active"),
        func.avg(run_seconds).filter(completed).label("mean_run_seconds"),
    ]


def _experiment_counts(row: Any) -> dict[str, Any]:
    counts: dict[str, Any] = {name: int(getattr(row, name) or 0) for name in EXPERIMENT_FIELDS}
    mean = row.mean_run_seconds
    counts["mean_run_seconds"] = round(float(mean), 1) if mean is not None else None
    return counts


# --- per user -------------------------------------------------------------------------


@dataclass(frozen=True, slots=True)
class UserFilter:
    q: str | None = None
    role: Role | None = None
    user_id: uuid.UUID | None = None


def _user_stats(window: Window, where: UserFilter) -> tuple[Select[Any], dict[str, Any]]:
    success = LoginEvent.result == LoginResult.SUCCESS
    raw = (
        select(
            LoginEvent.user_id.label("user_id"),
            func.count().filter(success).label("ok"),
            func.count().filter(~success).label("bad"),
        )
        .where(LoginEvent.user_id.is_not(None), window.within(LoginEvent.at))
        .group_by(LoginEvent.user_id)
        .subquery("raw")
    )
    rolled = (
        select(
            LoginStatsMonthly.user_id.label("user_id"),
            func.sum(LoginStatsMonthly.successes).label("ok"),
            func.sum(LoginStatsMonthly.failures).label("bad"),
        )
        .where(window.months())
        .group_by(LoginStatsMonthly.user_id)
        .subquery("rolled")
    )
    runs = (
        select(Experiment.owner_id.label("user_id"), *_experiment_columns(window))
        .group_by(Experiment.owner_id)
        .subquery("runs")
    )
    columns: dict[str, Any] = {
        "sign_ins": func.coalesce(raw.c.ok, 0) + func.coalesce(rolled.c.ok, 0),
        "failed_sign_ins": func.coalesce(raw.c.bad, 0) + func.coalesce(rolled.c.bad, 0),
        **{name: func.coalesce(runs.c[name], 0) for name in EXPERIMENT_FIELDS},
        "mean_run_seconds": runs.c.mean_run_seconds,
    }
    conditions: list[ColumnElement[bool]] = [User.deleted_at.is_(None)]
    if where.q:
        conditions.append(users_repository.matches(where.q))
    if where.role is not None:
        conditions.append(User.role == where.role)
    if where.user_id is not None:
        conditions.append(User.id == where.user_id)
    statement = (
        select(User, *(c.label(name) for name, c in columns.items()))
        .outerjoin(raw, raw.c.user_id == User.id)
        .outerjoin(rolled, rolled.c.user_id == User.id)
        .outerjoin(runs, runs.c.user_id == User.id)
        .where(*conditions)
    )
    return statement, columns


@dataclass(frozen=True, slots=True)
class UserStatsRow:
    user: User
    sign_ins: int
    failed_sign_ins: int
    counts: dict[str, Any]
    last_login_method: LoginMethod | None


async def _last_methods(db: AsyncSession, ids: Sequence[uuid.UUID]) -> dict[uuid.UUID, LoginMethod]:
    if not ids:
        return {}
    rows = await db.execute(
        select(LoginEvent.user_id, LoginEvent.method)
        .where(LoginEvent.user_id.in_(ids), LoginEvent.result == LoginResult.SUCCESS)
        .ext(distinct_on(LoginEvent.user_id))
        .order_by(LoginEvent.user_id, LoginEvent.at.desc())
    )
    return {r[0]: r[1] for r in rows if r[0] is not None}


async def user_stats(
    db: AsyncSession,
    window: Window,
    where: UserFilter,
    *,
    sort: UserStatsSort = "-last_login_at",
    page: int = 1,
    size: int = 50,
) -> tuple[list[UserStatsRow], int]:
    statement, columns = _user_stats(window, where)
    total = int(await db.scalar(select(func.count()).select_from(statement.subquery())) or 0)
    order = {
        "username": func.lower(User.username).asc(),
        "-last_login_at": User.last_login_at.desc().nulls_last(),
        "-sign_ins": columns["sign_ins"].desc(),
        "-experiments_submitted": columns["experiments_submitted"].desc(),
        "-experiments_completed": columns["experiments_completed"].desc(),
    }[sort]
    rows = (
        await db.execute(statement.order_by(order, User.id).offset((page - 1) * size).limit(size))
    ).all()
    methods = await _last_methods(db, [r.User.id for r in rows])
    return [
        UserStatsRow(
            user=r.User,
            sign_ins=int(r.sign_ins),
            failed_sign_ins=int(r.failed_sign_ins),
            counts=_experiment_counts(r),
            last_login_method=methods.get(r.User.id),
        )
        for r in rows
    ], total


async def recent_sign_ins(db: AsyncSession, user_id: uuid.UUID) -> list[LoginEvent]:
    rows = await db.execute(
        select(LoginEvent)
        .where(LoginEvent.user_id == user_id)
        .order_by(LoginEvent.at.desc())
        .limit(RECENT)
    )
    return list(rows.scalars())


async def recent_experiments(db: AsyncSession, user_id: uuid.UUID) -> list[Experiment]:
    rows = await db.execute(
        select(Experiment)
        .where(Experiment.owner_id == user_id)
        .order_by(Experiment.queued_at.desc())
        .limit(RECENT)
    )
    return list(rows.scalars())


# --- platform -----------------------------------------------------------------------


@dataclass(frozen=True, slots=True)
class PlatformStats:
    users: dict[str, int]
    sign_ins: int
    failed_sign_ins: int
    experiments: dict[str, Any]
    by_scenario: list[tuple[str, dict[str, Any]]]
    by_week: list[tuple[datetime, int, int]]


async def _user_totals(db: AsyncSession, window: Window) -> dict[str, int]:
    row = (
        await db.execute(
            select(
                func.count().label("total"),
                func.count().filter(User.is_active).label("active"),
                func.count().filter(User.role == Role.ADMIN).label("admins"),
                func.count().filter(User.role == Role.MEMBER).label("members"),
                func.count().filter(User.password_hash.is_(None)).label("sso"),
                func.count().filter(User.password_hash.is_not(None)).label("local"),
            ).where(User.deleted_at.is_(None))
        )
    ).one()
    signed_in = union(
        select(LoginEvent.user_id).where(
            LoginEvent.user_id.is_not(None),
            LoginEvent.result == LoginResult.SUCCESS,
            window.within(LoginEvent.at),
        ),
        select(LoginStatsMonthly.user_id).where(LoginStatsMonthly.successes > 0, window.months()),
    ).subquery("signed_in")
    active_in_period = await db.scalar(select(func.count(distinct(signed_in.c.user_id))))
    return {**row._asdict(), "active_in_period": int(active_in_period or 0)}


async def _sign_in_totals(db: AsyncSession, window: Window) -> tuple[int, int]:
    success = LoginEvent.result == LoginResult.SUCCESS
    raw = (
        await db.execute(
            select(func.count().filter(success), func.count().filter(~success)).where(
                window.within(LoginEvent.at)
            )
        )
    ).one()
    rolled = (
        await db.execute(
            select(
                func.coalesce(func.sum(LoginStatsMonthly.successes), 0),
                func.coalesce(func.sum(LoginStatsMonthly.failures), 0),
            ).where(window.months())
        )
    ).one()
    return int(raw[0]) + int(rolled[0]), int(raw[1]) + int(rolled[1])


def _week(column: Any) -> Any:
    return func.date_trunc("week", column, literal("UTC"))


async def _by_week(
    db: AsyncSession, window: Window, scenario: ColumnElement[bool]
) -> list[tuple[datetime, int, int]]:
    sign_in_week = _week(LoginEvent.at)
    sign_ins = await db.execute(
        select(sign_in_week, func.count())
        .where(LoginEvent.result == LoginResult.SUCCESS, window.within(LoginEvent.at))
        .group_by(sign_in_week)
    )
    queued_week = _week(Experiment.queued_at)
    submitted = await db.execute(
        select(queued_week, func.count())
        .where(window.within(Experiment.queued_at), scenario)
        .group_by(queued_week)
    )
    weeks: dict[datetime, list[int]] = {}
    for week, n in sign_ins:
        weeks.setdefault(week, [0, 0])[0] = int(n)
    for week, n in submitted:
        weeks.setdefault(week, [0, 0])[1] = int(n)
    return [(week, ok, runs) for week, (ok, runs) in sorted(weeks.items())]


async def platform_stats(db: AsyncSession, window: Window, scenario: str | None) -> PlatformStats:
    in_scenario: ColumnElement[bool] = (
        Experiment.scenario_name == scenario if scenario is not None else true()
    )
    users = await _user_totals(db, window)
    sign_ins, failed = await _sign_in_totals(db, window)
    totals = (await db.execute(select(*_experiment_columns(window)).where(in_scenario))).one()
    per_scenario = await db.execute(
        select(Experiment.scenario_name, *_experiment_columns(window))
        .where(in_scenario)
        .group_by(Experiment.scenario_name)
        .order_by(Experiment.scenario_name)
    )
    return PlatformStats(
        users=users,
        sign_ins=sign_ins,
        failed_sign_ins=failed,
        experiments=_experiment_counts(totals),
        by_scenario=[(r.scenario_name, _experiment_counts(r)) for r in per_scenario],
        by_week=await _by_week(db, window, in_scenario),
    )
