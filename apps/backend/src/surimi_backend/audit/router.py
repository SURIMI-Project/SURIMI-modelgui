"""`/api/v1/admin/audit-events`: who did what to whom, newest first (ADR 0005,
docs/features/observability-and-activity § Audit log)."""

from __future__ import annotations

import uuid
from typing import Annotated

from fastapi import APIRouter, Query

from surimi_backend.audit import repository
from surimi_backend.audit.models import AuditEvent
from surimi_backend.audit.repository import AuditFilter
from surimi_backend.audit.schemas import AuditEventOut, AuditEventPage
from surimi_backend.auth.dependencies import AdminUser, Db
from surimi_backend.observability.router import ERRORS, From, To, window
from surimi_backend.observability.schemas import Period

router = APIRouter(prefix="/api/v1/admin/audit-events", tags=["Admin: activity"])


@router.get("", response_model=AuditEventPage, summary="Browse the audit log", responses=ERRORS)
async def list_audit_events(
    _: AdminUser,
    db: Db,
    actor_id: uuid.UUID | None = None,
    action: Annotated[str | None, Query(max_length=100, examples=["experiment.cancelled"])] = None,
    target_type: Annotated[str | None, Query(max_length=100, examples=["user"])] = None,
    target_id: Annotated[str | None, Query(max_length=200)] = None,
    start: From = None,
    end: To = None,
    page: Annotated[int, Query(ge=1)] = 1,
    size: Annotated[int, Query(ge=1, le=200)] = 50,
) -> AuditEventPage:
    w = window(start, end)
    rows, total = await repository.list_events(
        db,
        AuditFilter(actor_id=actor_id, action=action, target_type=target_type, target_id=target_id),
        w.within(AuditEvent.at),
        page=page,
        size=size,
    )
    return AuditEventPage(
        items=[
            AuditEventOut(
                id=e.id,
                at=e.at,
                actor_id=e.actor_id,
                actor_username=username,
                action=e.action,
                target_type=e.target_type,
                target_id=e.target_id,
                details=e.details,
            )
            for e, username in rows
        ],
        total=total,
        page=page,
        size=size,
        period=Period(start=w.start, end=w.end),
    )
