"""The audit log as admins read it (ADR 0005, ADR 0013: kept 24 months)."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field

from surimi_backend.observability.schemas import Period


class AuditEventOut(BaseModel):
    id: int = Field(examples=[1532])
    at: datetime
    actor_id: uuid.UUID | None = Field(description="None for the system (SSO sync, purges)")
    actor_username: str | None = Field(
        description="None for the system, or when the actor no longer exists", examples=["admin"]
    )
    action: str = Field(examples=["experiment.cancelled"])
    target_type: str = Field(examples=["experiment"])
    target_id: str = Field(examples=["77c1e2a4-5b1f-4c8e-9d0a-2f6b3c4d5e6f"])
    details: dict[str, Any] | None = Field(examples=[{"owner_id": "9d4c1d3a-…"}])


class AuditEventPage(BaseModel):
    items: list[AuditEventOut]
    total: int
    page: int
    size: int
    period: Period
