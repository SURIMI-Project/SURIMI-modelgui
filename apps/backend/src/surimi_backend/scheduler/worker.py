"""`surimi-backend worker` (ADR 0019): one leader at a time, chosen by a
PostgreSQL advisory lock held on a dedicated connection. The leader runs a
cycle every POLL_INTERVAL_SECONDS, or at once when the API sends
`NOTIFY surimi_dispatch`:

1. poll the controller and update the experiments in flight;
2. dispatch queued experiments that fit in the free Ecopath pods;
3. index finished runs' outputs;
4. once a day, purge rows past their retention (ADR 0013).

Each step is idempotent and commits on its own; a failure is logged and the
next cycle repeats it.
"""

from __future__ import annotations

import asyncio
import contextlib
import time
from collections.abc import Awaitable, Callable
from typing import Any

import structlog
from opentelemetry import trace
from sqlalchemy.ext.asyncio import AsyncSession

from surimi_backend.core.config import Settings
from surimi_backend.core.db import connect_raw, create_engine, create_sessionmaker
from surimi_backend.experiments import repository as experiments_repository
from surimi_backend.experiments.events import DISPATCH_CHANNEL
from surimi_backend.experiments.models import FINAL_STATES, IN_FLIGHT_STATES, ExperimentStatus
from surimi_backend.integrations.controller import ControllerClient, build_controller_client
from surimi_backend.observability import metrics
from surimi_backend.observability.retention import purge_retention
from surimi_backend.observability.tracing import WORKER_SERVICE, configure_tracing, shutdown_tracing
from surimi_backend.outputs.indexer import index_pending
from surimi_backend.outputs.read import OutputReader
from surimi_backend.outputs.storage import OutputStorage
from surimi_backend.scheduler.dispatcher import dispatch
from surimi_backend.scheduler.poller import poll
from surimi_backend.startup import config_summary

log = structlog.get_logger("surimi.worker")
# A no-op tracer unless tracing is configured (observability/tracing.py).
tracer = trace.get_tracer("surimi.worker")

# pg_try_advisory_lock key: "SURIMI-W" as a 64-bit integer.
LEADER_LOCK_KEY = 0x5355_5249_4D49_2D57
STANDBY_RETRY_SECONDS = 10.0


class Worker:
    def __init__(
        self,
        settings: Settings,
        *,
        controller: ControllerClient | None = None,
    ) -> None:
        self.settings = settings
        # Before the engine and the controller channel: the instrumentations patch them.
        self.tracing = configure_tracing(settings, WORKER_SERVICE) is not None
        self.engine = create_engine(settings)
        self.sessionmaker = create_sessionmaker(self.engine)
        self.controller = controller or build_controller_client(settings)
        self.storage = OutputStorage(settings)
        self.reader = OutputReader(
            self.storage,
            cache_mb=min(settings.output_chunk_cache_mb, 64),
            merge_gap_kb=settings.output_range_merge_gap_kb,
        )
        self.wake = asyncio.Event()
        # time.monotonic() of the next retention purge; 0 = at the first cycle as leader.
        self.next_purge = 0.0

    async def cycle(self) -> dict[str, int]:
        started = time.perf_counter()
        result = {"changed": 0, "dispatched": 0, "indexed": 0}
        steps: list[tuple[str, Callable[[AsyncSession], Awaitable[int]]]] = [
            ("changed", lambda db: poll(db, self.controller, self.settings)),
            ("dispatched", lambda db: dispatch(db, self.controller, self.settings)),
            ("indexed", lambda db: index_pending(db, self.storage, self.reader, self.settings)),
        ]
        with tracer.start_as_current_span("worker.cycle") as span:
            for name, step in steps:
                try:
                    with tracer.start_as_current_span(f"worker.{name}"):
                        async with self.sessionmaker() as db:
                            result[name] = await step(db)
                except Exception:
                    metrics.WORKER_STEP_FAILURES.labels(name).inc()
                    log.exception("worker.step_failed", step=name)
            await self.update_gauges()
            span.set_attributes({f"surimi.{k}": v for k, v in result.items()})
        elapsed = time.perf_counter() - started
        metrics.WORKER_CYCLE_DURATION.observe(elapsed)
        if any(result.values()):
            log.info("scheduler.cycle", **result, ms=round(elapsed * 1000))
        return result

    async def update_gauges(self) -> None:
        """Experiments by state, stalled and pods in use, for Prometheus. A
        failure only leaves the previous values."""
        try:
            async with self.sessionmaker() as db:
                rows = await experiments_repository.active_counts(db)
        except Exception:  # metrics must not stop the cycle
            log.warning("worker.gauges_failed", exc_info=True)
            return
        by_status = {r.status: r for r in rows}
        for status in ExperimentStatus:
            if status not in FINAL_STATES:
                row = by_status.get(status)
                metrics.EXPERIMENTS_ACTIVE.labels(status.value).set(row.experiments if row else 0)
        metrics.EXPERIMENTS_STALLED.set(sum(r.stalled for r in rows))
        metrics.ECOPATH_PODS_IN_USE.set(sum(r.pods for r in rows if r.status in IN_FLIGHT_STATES))

    async def purge_if_due(self) -> None:
        """ADR 0013 retention, once per RETENTION_PURGE_INTERVAL_HOURS. The time
        is kept in memory: a new leader purges at once, which is harmless."""
        if time.monotonic() < self.next_purge:
            return
        self.next_purge = time.monotonic() + self.settings.retention_purge_interval_hours * 3600
        with tracer.start_as_current_span("worker.retention"):
            await purge_retention(self.sessionmaker, self.settings)

    @staticmethod
    def clear_gauges() -> None:
        """A worker that stops leading no longer knows the current state."""
        metrics.WORKER_LEADER.set(0)
        # Zeros, not clear(): prometheus-client cannot clear labels in multiprocess mode.
        for status in ExperimentStatus:
            if status not in FINAL_STATES:
                metrics.EXPERIMENTS_ACTIVE.labels(status.value).set(0)
        metrics.EXPERIMENTS_STALLED.set(0)
        metrics.ECOPATH_PODS_IN_USE.set(0)

    async def lead(self, lock: Any) -> None:
        """Runs cycles while this worker holds the lock."""
        listener = await connect_raw(self.settings)
        await listener.add_listener(DISPATCH_CHANNEL, lambda *_: self.wake.set())
        log.info("worker.leading")
        metrics.WORKER_LEADER.set(1)
        try:
            self.next_purge = 0.0
            while True:
                self.wake.clear()
                await self.cycle()
                await self.purge_if_due()
                await lock.fetchval("SELECT 1")  # raises if the lock connection is gone
                with contextlib.suppress(TimeoutError):
                    await asyncio.wait_for(self.wake.wait(), self.settings.poll_interval_seconds)
        finally:
            self.clear_gauges()
            with contextlib.suppress(Exception):
                await listener.close()

    async def run(self) -> None:
        log.info(
            "worker.started",
            controller_mode=self.settings.controller_mode,
            outputs=self.settings.outputs_uri,
            metrics_port=self.settings.worker_metrics_port
            if self.settings.metrics_enabled
            else None,
            tracing_enabled=self.tracing,
        )
        log.info("worker.config", **config_summary(self.settings))
        metrics.start_worker_metrics_server(self.settings)
        try:
            while True:
                lock: Any = None
                try:
                    lock = await connect_raw(self.settings)
                    if await lock.fetchval("SELECT pg_try_advisory_lock($1)", LEADER_LOCK_KEY):
                        await self.lead(lock)
                    else:
                        log.debug("worker.standby")
                except (TimeoutError, OSError) as exc:
                    log.warning("worker.database_unavailable", error=str(exc))
                except Exception:
                    log.exception("worker.leader_lost")
                finally:
                    if lock is not None:
                        with contextlib.suppress(Exception):
                            await lock.close()  # also releases the advisory lock
                await asyncio.sleep(STANDBY_RETRY_SECONDS)
        finally:
            await self.controller.close()
            await self.engine.dispose()
            shutdown_tracing()


async def run_worker(settings: Settings) -> None:
    await Worker(settings).run()
