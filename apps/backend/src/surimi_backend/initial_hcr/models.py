"""Snapshots of the controller's initial HCR data (ADR 0028): one row per
distinct answer per scenario, found by the hash of its entries. A record only:
the form always reads the controller (ADR 0027). Never purged."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import CheckConstraint, DateTime, Index, Integer, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from surimi_backend.core.db import Base


class InitialHcrSnapshot(Base):
    __tablename__ = "initial_hcr_snapshots"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    scenario_name: Mapped[str] = mapped_column(Text)
    # SHA-256 (hex) of `entries` as canonical JSON: equal answers, equal hash.
    content_hash: Mapped[str] = mapped_column(Text)
    # The controller's entries in our field names (initial_hcr.service.to_stored),
    # values exactly as sent, 0 kept; no species names (they are joined when read).
    entries: Mapped[list[dict[str, Any]]] = mapped_column(JSONB)
    entry_count: Mapped[int] = mapped_column(Integer)
    first_seen_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    __table_args__ = (
        # One row per version: the conflict target of the insert, and the
        # scenario filter of the history list.
        Index(
            "initial_hcr_snapshots_scenario_hash_uq",
            scenario_name,
            content_hash,
            unique=True,
        ),
        CheckConstraint("jsonb_typeof(entries) = 'array'", name="entries_array"),
    )
