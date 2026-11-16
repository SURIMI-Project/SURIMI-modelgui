"""Experiments, their simulations and events (docs/database/schema.dbml,
ADR 0015 for the queue columns)."""

from __future__ import annotations

import enum
import uuid
from datetime import datetime, timedelta
from typing import Any

from sqlalchemy import (
    REAL,
    BigInteger,
    Boolean,
    DateTime,
    ForeignKey,
    Identity,
    Index,
    Integer,
    Interval,
    Text,
    false,
    func,
    text,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from surimi_backend.core.db import Base
from surimi_backend.users.models import pg_enum


class ExperimentStatus(enum.StrEnum):
    QUEUED = "queued"  # waiting for Ecopath pods (ADR 0015)
    SUBMITTING = "submitting"
    SUBMIT_FAILED = "submit_failed"
    SUBMITTED = "submitted"
    # Some simulation is still Initialising (the others may be Initialised).
    INITIALISING = "initialising"
    # Every simulation is Initialised: the controller starts them all together
    # once its experiment services (CMSY, output creator, value chain) are ready.
    INITIALISED = "initialised"
    RUNNING = "running"  # at least one simulation is Running
    # The controller reports Finished; the worker waits for the .nc in the
    # bucket and indexes it. No Ecopath pod is held.
    COPYING_RESULTS = "copying_results"
    COMPLETED = "completed"  # results in the bucket and indexed
    FAILED = "failed"  # controller Error, never started, lost, or no usable results
    CANCELLING = "cancelling"
    CANCELLED = "cancelled"


FINAL_STATES = frozenset(
    {
        ExperimentStatus.SUBMIT_FAILED,
        ExperimentStatus.COMPLETED,
        ExperimentStatus.FAILED,
        ExperimentStatus.CANCELLED,
    }
)
# On the controller, or about to be: these hold (or may hold) Ecopath pods.
IN_FLIGHT_STATES = frozenset(
    {
        ExperimentStatus.SUBMITTING,
        ExperimentStatus.SUBMITTED,
        ExperimentStatus.INITIALISING,
        ExperimentStatus.INITIALISED,
        ExperimentStatus.RUNNING,
        ExperimentStatus.CANCELLING,
    }
)
# Polled by the worker.
POLLED_STATES = IN_FLIGHT_STATES - {ExperimentStatus.SUBMITTING}


class SimulationState(enum.StrEnum):
    INITIALISING = "initialising"
    INITIALISED = "initialised"
    RUNNING = "running"
    FINISHED = "finished"
    FAILED = "failed"  # controller Error
    CANCELLED = "cancelled"  # controller Canceled
    UNKNOWN = "unknown"  # a controller string not in the mapping


class Experiment(Base):
    __tablename__ = "experiments"

    # Also the controller's experiment_id; we generate it.
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    owner_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="RESTRICT")
    )
    name: Mapped[str] = mapped_column(Text)
    scenario_name: Mapped[str] = mapped_column(Text)
    # What we send, HCR biomass in kg as on the wire (ADR 0022).
    request: Mapped[dict[str, Any]] = mapped_column(JSONB)
    protocol_version: Mapped[str] = mapped_column(Text)
    status: Mapped[ExperimentStatus] = mapped_column(
        pg_enum(ExperimentStatus, "experiment_status"),
        default=ExperimentStatus.QUEUED,
        server_default=ExperimentStatus.QUEUED.value,
    )
    controller_status_raw: Mapped[str | None] = mapped_column(Text)
    is_mse_run: Mapped[bool] = mapped_column(Boolean)
    pods_required: Mapped[int] = mapped_column(Integer)
    priority: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    queued_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    submit_attempts: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    submitted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    # When the run ended on the controller (or failed, or was cancelled).
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    # When its results were in the bucket and indexed (status completed).
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    cancel_requested_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    progress: Mapped[float | None] = mapped_column(REAL)
    last_progress_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    stalled: Mapped[bool] = mapped_column(Boolean, default=False, server_default=false())
    stalled_reason: Mapped[str | None] = mapped_column(Text)
    missing_polls: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    error: Mapped[str | None] = mapped_column(Text)
    cloned_from_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("experiments.id", ondelete="SET NULL")
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    __table_args__ = (
        Index(
            "experiments_owner_created_idx",
            owner_id,
            created_at.desc(),
            postgresql_where=text("deleted_at IS NULL"),
        ),
        Index(
            "experiments_created_idx",
            created_at.desc(),
            postgresql_where=text("deleted_at IS NULL"),
        ),
        Index(
            "experiments_status_created_idx",
            status,
            created_at.desc(),
            postgresql_where=text("deleted_at IS NULL"),
        ),
        Index(
            "experiments_in_flight_idx",
            status,
            postgresql_where=text(
                "status IN ('submitting', 'submitted', 'initialising', 'initialised', 'running', "
                "'cancelling')"
            ),
            postgresql_include=["owner_id", "pods_required"],
        ),
        Index(
            "experiments_queue_idx",
            priority.desc(),
            queued_at,
            postgresql_where=text("status = 'queued'"),
        ),
        Index(
            "experiments_owner_finished_idx",
            owner_id,
            finished_at,
            postgresql_where=text("finished_at IS NOT NULL"),
            postgresql_include=["status"],
        ),
        Index(
            "experiments_name_fts_idx",
            func.to_tsvector(text("'simple'"), name),
            postgresql_using="gin",
        ),
        Index(
            "experiments_cloned_from_idx",
            cloned_from_id,
            postgresql_where=text("cloned_from_id IS NOT NULL"),
        ),
        Index(
            "experiments_deleted_idx",
            deleted_at,
            postgresql_where=text("deleted_at IS NOT NULL"),
        ),
        Index(
            "experiments_stalled_idx",
            last_progress_at,
            postgresql_where=text("stalled"),
        ),
    )


class Simulation(Base):
    __tablename__ = "simulations"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)  # controller's
    experiment_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("experiments.id", ondelete="CASCADE")
    )
    sim_order: Mapped[int] = mapped_column(Integer)
    status: Mapped[SimulationState] = mapped_column(pg_enum(SimulationState, "simulation_status"))
    status_raw: Mapped[str] = mapped_column(Text)
    start_date_time: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    end_date_time: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    simulation_started: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    simulation_current: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    duration: Mapped[timedelta | None] = mapped_column(Interval)
    ecology_host: Mapped[str | None] = mapped_column(Text)
    first_seen_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    last_seen_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    # When this simulation entered its current status (for the Initialising timeout).
    status_since: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    __table_args__ = (
        Index("simulations_experiment_id_sim_order_uq", experiment_id, sim_order, unique=True),
    )


class ExperimentEvent(Base):
    __tablename__ = "experiment_events"

    id: Mapped[int] = mapped_column(BigInteger, Identity(always=False), primary_key=True)
    experiment_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("experiments.id", ondelete="CASCADE")
    )
    # Copied from experiments so the events feed (ADR 0021) needs no join.
    owner_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE")
    )
    type: Mapped[str] = mapped_column(Text)
    data: Mapped[dict[str, Any]] = mapped_column(JSONB)
    at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        Index("experiment_events_experiment_id_id_idx", experiment_id, id),
        Index("experiment_events_owner_id_id_idx", owner_id, id),
    )


class AppSetting(Base):
    """Runtime switches admins change without a redeploy (`queue_paused`)."""

    __tablename__ = "app_settings"

    key: Mapped[str] = mapped_column(Text, primary_key=True)
    value: Mapped[Any] = mapped_column(JSONB)
    updated_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL")
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
