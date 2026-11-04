"""Who did what to whom (ADR 0005, ADR 0013: kept 24 months)."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import BigInteger, DateTime, ForeignKey, Identity, Index, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from surimi_backend.core.db import Base


class AuditEvent(Base):
    __tablename__ = "audit_events"

    id: Mapped[int] = mapped_column(BigInteger, Identity(always=False), primary_key=True)
    # None for the system (role synced from SSO, purges).
    actor_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL")
    )
    action: Mapped[str] = mapped_column(Text)  # user.created, role.synced, …
    target_type: Mapped[str] = mapped_column(Text)
    target_id: Mapped[str] = mapped_column(Text)
    details: Mapped[dict[str, Any] | None] = mapped_column(JSONB)
    at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        Index("audit_events_actor_at_idx", actor_id, at.desc()),
        Index("audit_events_target_at_idx", target_type, target_id, at.desc()),
        Index("audit_events_action_at_idx", action, at.desc()),
        Index("audit_events_at_idx", at),
    )
