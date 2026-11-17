"""Metadata of an experiment's outputs: where the file is, its chunk index and
data-quality report. No output values (ADR 0009, ADR 0020)."""

from __future__ import annotations

import enum
import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import BigInteger, DateTime, ForeignKey, Index, Integer, LargeBinary, Text, func
from sqlalchemy import text as sql_text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from surimi_backend.core.db import Base
from surimi_backend.users.models import pg_enum


class OutputState(enum.StrEnum):
    PENDING = "pending"
    WAITING_FOR_FILE = "waiting_for_file"
    INDEXING = "indexing"
    READY = "ready"
    FAILED = "failed"
    OUTPUTS_MISSING = "outputs_missing"  # the .nc is no longer in the bucket


class ExperimentOutput(Base):
    __tablename__ = "experiment_outputs"

    experiment_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("experiments.id", ondelete="CASCADE"), primary_key=True
    )
    uri: Mapped[str] = mapped_column(Text)  # <OUTPUTS_URI>/<id>/<id>.nc
    state: Mapped[OutputState] = mapped_column(
        pg_enum(OutputState, "output_state"),
        default=OutputState.PENDING,
        server_default=OutputState.PENDING.value,
    )
    parser_version: Mapped[str | None] = mapped_column(Text)
    size_bytes: Mapped[int | None] = mapped_column(BigInteger)
    # When size_bytes was last seen to change; indexed once stable (OUTPUT_STABLE_SECONDS).
    size_seen_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    # zlib-compressed JSON: chunk offsets and axes (ADR 0020).
    chunk_index: Mapped[bytes | None] = mapped_column(LargeBinary)
    report: Mapped[dict[str, Any] | None] = mapped_column(JSONB)
    error: Mapped[str | None] = mapped_column(Text)
    attempts: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    next_attempt_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    indexed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    __table_args__ = (
        Index(
            "experiment_outputs_todo_idx",
            next_attempt_at,
            postgresql_where=sql_text("state IN ('pending', 'waiting_for_file', 'indexing')"),
        ),
    )
