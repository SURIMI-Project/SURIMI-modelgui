"""Writing audit events. Callers add the event to their own transaction, so an
action and its audit row are committed together or not at all."""

from __future__ import annotations

import uuid
from typing import Any

import structlog
from sqlalchemy.ext.asyncio import AsyncSession

from surimi_backend.audit.models import AuditEvent

log = structlog.get_logger("surimi.audit")


def record(
    session: AsyncSession,
    *,
    actor_id: uuid.UUID | None,
    action: str,
    target_type: str,
    target_id: str,
    details: dict[str, Any] | None = None,
) -> None:
    session.add(
        AuditEvent(
            actor_id=actor_id,
            action=action,
            target_type=target_type,
            target_id=target_id,
            details=details,
        )
    )
    log.info(
        "audit." + action,
        actor_id=str(actor_id) if actor_id else None,
        target_type=target_type,
        target_id=target_id,
    )
