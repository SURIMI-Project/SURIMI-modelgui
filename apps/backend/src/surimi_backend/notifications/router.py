"""`GET /api/v1/events`: experiment events, polled (ADR 0021, supersedes the
SSE stream of ADR 0008).

A client starts without `after` and gets only the cursor (`last_id`); it then
asks `?after=<last_id>` every `poll_after_seconds` and gets what happened since,
oldest first. Owners see their own experiments' events; admins see all, or only
theirs with `?scope=mine`. Events are hints to refresh: the experiment
endpoints hold the state.
"""

from __future__ import annotations

from typing import Annotated, Literal

from fastapi import APIRouter, Query
from pydantic import BaseModel, Field
from sqlalchemy import ColumnElement, func, select, true

from surimi_backend.auth.dependencies import AppSettings, CurrentUser, Db, Principal
from surimi_backend.experiments.models import ExperimentEvent
from surimi_backend.experiments.schemas import EventOut
from surimi_backend.experiments.service import event_out

router = APIRouter(prefix="/api/v1/events", tags=["Notifications"])

MAX_LIMIT = 500


class EventFeedOut(BaseModel):
    events: list[EventOut] = Field(description="Oldest first; empty when nothing happened")
    last_id: int = Field(
        description="Pass as `after` in the next poll. 0 when there are no events yet",
        examples=[1042],
    )
    has_more: bool = Field(description="More events are waiting: poll again at once")
    poll_after_seconds: float = Field(
        description="How long to wait before the next poll: the worker's poll interval, "
        "since statuses cannot change faster",
        examples=[10.0],
    )


def _visible(principal: Principal, scope: str) -> ColumnElement[bool]:
    if principal.is_admin and scope == "all":
        return true()
    return ExperimentEvent.owner_id == principal.user.id


@router.get(
    "",
    response_model=EventFeedOut,
    summary="Experiment events since a cursor, for polling",
    description=(
        "Without `after`: no events, only the cursor to start from. With `after`: the "
        "events with a larger id, oldest first, at most `limit`."
    ),
)
async def events(
    principal: CurrentUser,
    settings: AppSettings,
    db: Db,
    after: Annotated[int | None, Query(ge=0, description="`last_id` of the previous poll")] = None,
    scope: Literal["all", "mine"] = "all",
    limit: Annotated[int, Query(ge=1, le=MAX_LIMIT)] = 100,
) -> EventFeedOut:
    poll = settings.poll_interval_seconds
    if after is None:
        newest = await db.scalar(
            select(func.max(ExperimentEvent.id)).where(_visible(principal, scope))
        )
        return EventFeedOut(events=[], last_id=newest or 0, has_more=False, poll_after_seconds=poll)

    statement = (
        select(ExperimentEvent)
        .where(ExperimentEvent.id > after, _visible(principal, scope))
        .order_by(ExperimentEvent.id)
        .limit(limit + 1)
    )
    rows = list((await db.execute(statement)).scalars())
    page = rows[:limit]
    return EventFeedOut(
        events=[event_out(e) for e in page],
        last_id=page[-1].id if page else after,
        has_more=len(rows) > limit,
        poll_after_seconds=poll,
    )
