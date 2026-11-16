"""`surimi-backend worker` (ADR 0019): one leader at a time, chosen by a
PostgreSQL advisory lock held on a dedicated connection. The leader runs a
cycle every POLL_INTERVAL_SECONDS, or at once when the API sends
`NOTIFY surimi_dispatch`:

1. poll the controller and update the experiments in flight;
2. dispatch queued experiments that fit in the free Ecopath pods;
3. index finished runs' outputs.

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
from sqlalchemy.ext.asyncio import AsyncSession

from surimi_backend.core.config import Settings
from surimi_backend.core.db import connect_raw, create_engine, create_sessionmaker
from surimi_backend.experiments.events import DISPATCH_CHANNEL
from surimi_backend.integrations.controller import ControllerClient, build_controller_client
from surimi_backend.outputs.indexer import index_pending
from surimi_backend.outputs.read import OutputReader
from surimi_backend.outputs.storage import OutputStorage
from surimi_backend.scheduler.dispatcher import dispatch
from surimi_backend.scheduler.poller import poll
from surimi_backend.startup import config_summary

log = structlog.get_logger("surimi.worker")

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

    async def cycle(self) -> dict[str, int]:
        started = time.perf_counter()
        result = {"changed": 0, "dispatched": 0, "indexed": 0}
        steps: list[tuple[str, Callable[[AsyncSession], Awaitable[int]]]] = [
            ("changed", lambda db: poll(db, self.controller, self.settings)),
            ("dispatched", lambda db: dispatch(db, self.controller, self.settings)),
            ("indexed", lambda db: index_pending(db, self.storage, self.reader, self.settings)),
        ]
        for name, step in steps:
            try:
                async with self.sessionmaker() as db:
                    result[name] = await step(db)
            except Exception:
                log.exception("worker.step_failed", step=name)
        if any(result.values()):
            log.info("scheduler.cycle", **result, ms=round((time.perf_counter() - started) * 1000))
        return result

    async def lead(self, lock: Any) -> None:
        """Runs cycles while this worker holds the lock."""
        listener = await connect_raw(self.settings)
        await listener.add_listener(DISPATCH_CHANNEL, lambda *_: self.wake.set())
        log.info("worker.leading")
        try:
            while True:
                self.wake.clear()
                await self.cycle()
                await lock.fetchval("SELECT 1")  # raises if the lock connection is gone
                with contextlib.suppress(TimeoutError):
                    await asyncio.wait_for(self.wake.wait(), self.settings.poll_interval_seconds)
        finally:
            with contextlib.suppress(Exception):
                await listener.close()

    async def run(self) -> None:
        log.info(
            "worker.started",
            controller_mode=self.settings.controller_mode,
            outputs=self.settings.outputs_uri,
        )
        log.info("worker.config", **config_summary(self.settings))
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


async def run_worker(settings: Settings) -> None:
    await Worker(settings).run()
