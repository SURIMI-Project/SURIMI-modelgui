"""Harvest control rule configurations (ADR 0025): a user keeps several named
sets of rules per scenario. The rules of a configuration are a `jsonb` array,
biomass in kg (ADR 0022); there are no scenario defaults (ADR 0024)."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Index, Text, func, text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from surimi_backend.core.db import Base


class HcrConfiguration(Base):
    __tablename__ = "hcr_configurations"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    owner_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE")
    )
    scenario_name: Mapped[str] = mapped_column(Text)
    name: Mapped[str] = mapped_column(Text)
    # A list of objects with species_code (the contract's spelling), life_stage,
    # biomass_limit_kg, biomass_base_kg and f_max, checked by hcr.schemas.HcrIn
    # before every write: the API is the only writer.
    rules: Mapped[list[dict[str, Any]]] = mapped_column(
        JSONB, default=list, server_default=text("'[]'::jsonb")
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    __table_args__ = (
        # One name per owner and scenario, compared without case; also serves the
        # list of a user's configurations for a scenario.
        Index(
            "hcr_configurations_name_uq",
            owner_id,
            scenario_name,
            func.lower(name),
            unique=True,
        ),
        CheckConstraint("jsonb_typeof(rules) = 'array'", name="rules_array"),
        CheckConstraint("length(name) BETWEEN 1 AND 100", name="name_length"),
    )
