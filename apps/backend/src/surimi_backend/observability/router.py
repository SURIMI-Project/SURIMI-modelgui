"""`/api/v1/admin/stats` and `/api/v1/admin/users/{id}/activity`: activity
statistics for admins (ADR 0010; docs/features/observability-and-activity)."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime
from typing import Annotated, Any

from fastapi import APIRouter, Query

from surimi_backend.auth.dependencies import AdminUser, Db
from surimi_backend.core.errors import InvalidInputError, NotFoundError
from surimi_backend.observability import repository
from surimi_backend.observability.repository import UserFilter, UserStatsRow, Window
from surimi_backend.observability.schemas import (
    ExperimentCounts,
    Period,
    PlatformStatsOut,
    RecentExperimentOut,
    ScenarioCounts,
    SignInCounts,
    SignInOut,
    UserActivityOut,
    UserStatsOut,
    UserStatsPage,
    UserStatsSort,
    UserTotals,
    WeekCounts,
)
from surimi_backend.users.models import Role

router = APIRouter(prefix="/api/v1/admin", tags=["Admin: activity"])

ERRORS: dict[int | str, dict[str, Any]] = {
    401: {"description": "Not signed in"},
    403: {"description": "Not an admin"},
    422: {"description": "Invalid input, or `from` not before `to`"},
}

From = Annotated[
    datetime | None,
    Query(alias="from", description="Inclusive, ISO 8601; no time zone = UTC"),
]
To = Annotated[
    datetime | None, Query(alias="to", description="Exclusive, ISO 8601; no time zone = UTC")
]


def _utc(value: datetime | None) -> datetime | None:
    if value is None:
        return None
    return value.replace(tzinfo=UTC) if value.tzinfo is None else value.astimezone(UTC)


def window(start: datetime | None, end: datetime | None) -> Window:
    """The period as given, in UTC; 422 when it is empty."""
    w = Window(_utc(start), _utc(end))
    if w.start is not None and w.end is not None and w.start >= w.end:
        raise InvalidInputError("`from` must be before `to`")
    return w


def _period(w: Window) -> Period:
    return Period(start=w.start, end=w.end)


def _user_out(row: UserStatsRow) -> UserStatsOut:
    user = row.user
    return UserStatsOut(
        user_id=user.id,
        username=user.username,
        display_name=user.display_name,
        email=user.email,
        role=user.role,
        is_active=user.is_active,
        account="sso" if user.is_sso else "local",
        last_login_at=user.last_login_at,
        last_login_method=row.last_login_method,
        sign_ins=row.sign_ins,
        failed_sign_ins=row.failed_sign_ins,
        **row.counts,
    )


@router.get(
    "/stats",
    response_model=PlatformStatsOut,
    summary="Platform totals for a period",
    responses=ERRORS,
)
async def platform_stats(
    _: AdminUser,
    db: Db,
    start: From = None,
    end: To = None,
    scenario: Annotated[
        str | None, Query(max_length=100, description="Experiments of one scenario only")
    ] = None,
) -> PlatformStatsOut:
    w = window(start, end)
    stats = await repository.platform_stats(db, w, scenario)
    return PlatformStatsOut(
        period=_period(w),
        scenario_name=scenario,
        users=UserTotals(**stats.users),
        sign_ins=SignInCounts(sign_ins=stats.sign_ins, failed_sign_ins=stats.failed_sign_ins),
        experiments=ExperimentCounts(**stats.experiments),
        by_scenario=[ScenarioCounts(scenario_name=n, **c) for n, c in stats.by_scenario],
        by_week=[
            WeekCounts(week=week, sign_ins=ok, experiments_submitted=runs)
            for week, ok, runs in stats.by_week
        ],
    )


@router.get(
    "/stats/users",
    response_model=UserStatsPage,
    summary="Sign-ins and experiments per user for a period",
    responses=ERRORS,
)
async def user_stats(
    _: AdminUser,
    db: Db,
    start: From = None,
    end: To = None,
    q: Annotated[
        str | None, Query(max_length=100, description="Part of e-mail, username or name")
    ] = None,
    role: Role | None = None,
    sort: UserStatsSort = "-last_login_at",
    page: Annotated[int, Query(ge=1)] = 1,
    size: Annotated[int, Query(ge=1, le=200)] = 50,
) -> UserStatsPage:
    w = window(start, end)
    rows, total = await repository.user_stats(
        db, w, UserFilter(q=q, role=role), sort=sort, page=page, size=size
    )
    return UserStatsPage(
        items=[_user_out(r) for r in rows], total=total, page=page, size=size, period=_period(w)
    )


@router.get(
    "/users/{user_id}/activity",
    response_model=UserActivityOut,
    summary="One user's statistics, recent sign-ins and experiments",
    responses={**ERRORS, 404: {"description": "No such user"}},
)
async def user_activity(
    user_id: uuid.UUID, _: AdminUser, db: Db, start: From = None, end: To = None
) -> UserActivityOut:
    w = window(start, end)
    rows, _total = await repository.user_stats(db, w, UserFilter(user_id=user_id), size=1)
    if not rows:
        raise NotFoundError(f"user {user_id} does not exist")
    return UserActivityOut(
        stats=_user_out(rows[0]),
        period=_period(w),
        recent_sign_ins=[
            SignInOut(
                at=e.at,
                method=e.method,
                provider=e.provider,
                result=e.result,
                ip=str(e.ip) if e.ip is not None else None,
                user_agent=e.user_agent,
            )
            for e in await repository.recent_sign_ins(db, user_id)
        ],
        recent_experiments=[
            RecentExperimentOut(
                id=e.id,
                name=e.name,
                scenario_name=e.scenario_name,
                status=e.status,
                queued_at=e.queued_at,
                finished_at=e.finished_at,
                deleted=e.deleted_at is not None,
            )
            for e in await repository.recent_experiments(db, user_id)
        ],
    )
