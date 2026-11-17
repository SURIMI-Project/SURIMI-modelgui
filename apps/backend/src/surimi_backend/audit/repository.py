"""SQL for reading the audit log; each filter has an index
(docs/database/README.md § Indexing, "Audit by actor, by target, or by action")."""

from __future__ import annotations

import uuid
from dataclasses import dataclass
from typing import Any

from sqlalchemy import ColumnElement, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from surimi_backend.audit.models import AuditEvent
from surimi_backend.users.models import User


@dataclass(frozen=True, slots=True)
class AuditFilter:
    actor_id: uuid.UUID | None = None
    action: str | None = None
    target_type: str | None = None
    target_id: str | None = None


async def list_events(
    db: AsyncSession,
    where: AuditFilter,
    period: ColumnElement[bool],
    *,
    page: int,
    size: int,
) -> tuple[list[tuple[AuditEvent, str | None]], int]:
    conditions: list[ColumnElement[bool]] = [period]
    if where.actor_id is not None:
        conditions.append(AuditEvent.actor_id == where.actor_id)
    if where.action is not None:
        conditions.append(AuditEvent.action == where.action)
    if where.target_type is not None:
        conditions.append(AuditEvent.target_type == where.target_type)
    if where.target_id is not None:
        conditions.append(AuditEvent.target_id == where.target_id)
    total = int(await db.scalar(select(func.count()).where(*conditions)) or 0)
    rows: Any = await db.execute(
        select(AuditEvent, User.username)
        .outerjoin(User, User.id == AuditEvent.actor_id)
        .where(*conditions)
        .order_by(AuditEvent.at.desc(), AuditEvent.id.desc())
        .offset((page - 1) * size)
        .limit(size)
    )
    return [(r[0], r[1]) for r in rows], total
