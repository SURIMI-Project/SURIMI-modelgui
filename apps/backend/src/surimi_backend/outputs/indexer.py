"""Worker job: index the outputs of finished runs (ADR 0009, ADR 0020).

Driven by `experiment_outputs` rows (ADR 0019): a row is created `pending`
when the poller sees a run finish, and the experiment is then
`copying_results`. The job waits until the `.nc` exists and its size has not
changed for OUTPUT_STABLE_SECONDS (the output creator may still be writing),
builds the chunk index, computes the data-quality report through the same
reader the API uses, and marks the row `ready` and the experiment
`completed`. No file after OUTPUT_WAIT_MINUTES, or a file that cannot be
indexed after OUTPUT_INDEX_MAX_ATTEMPTS, makes the experiment `failed`.
"""

from __future__ import annotations

import asyncio
from collections.abc import Sequence
from datetime import UTC, datetime, timedelta

import structlog
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from surimi_backend.core.config import Settings
from surimi_backend.experiments.events import emit
from surimi_backend.experiments.models import Experiment, ExperimentStatus
from surimi_backend.outputs.build import build_index
from surimi_backend.outputs.index import PARSER_VERSION, Variable, pack, unpack
from surimi_backend.outputs.models import ExperimentOutput, OutputState
from surimi_backend.outputs.queries import report
from surimi_backend.outputs.read import Array, OutputReader
from surimi_backend.outputs.storage import OutputStorage, StorageUnavailableError

log = structlog.get_logger("surimi.outputs")

TODO = (OutputState.PENDING, OutputState.WAITING_FOR_FILE, OutputState.INDEXING)


def _index_sync(
    storage: OutputStorage, reader: OutputReader, row: ExperimentOutput, size: int
) -> tuple[bytes, dict[str, object]]:
    with storage.open_sync(row.uri) as handle:
        blob = pack(build_index(handle, size))
    parsed = unpack(blob)

    def read(var: Variable, box: Sequence[slice]) -> Array:
        return reader.read_box_sync(row.uri, row.experiment_id, var, box)

    return blob, report(parsed, read)


async def index_pending(
    db: AsyncSession,
    storage: OutputStorage,
    reader: OutputReader,
    settings: Settings,
    *,
    limit: int = 3,
) -> int:
    now = datetime.now(UTC)
    rows = list(
        (
            await db.execute(
                select(ExperimentOutput)
                .where(ExperimentOutput.state.in_(TODO), ExperimentOutput.next_attempt_at <= now)
                .order_by(ExperimentOutput.next_attempt_at)
                .limit(limit)
            )
        ).scalars()
    )
    done = 0
    for row in rows:
        if await index_one(db, storage, reader, settings, row):
            done += 1
    return done


async def index_one(
    db: AsyncSession,
    storage: OutputStorage,
    reader: OutputReader,
    settings: Settings,
    row: ExperimentOutput,
) -> bool:
    """True when the row became ready."""
    experiment = await db.get(Experiment, row.experiment_id)
    now = datetime.now(UTC)
    try:
        size = await storage.size(row.uri)
    except StorageUnavailableError as exc:
        log.warning(
            "outputs.storage_unavailable", experiment_id=str(row.experiment_id), error=exc.message
        )
        row.next_attempt_at = now + timedelta(minutes=1)
        await db.commit()
        return False

    if size is None:
        if now - row.created_at > timedelta(minutes=settings.output_wait_minutes):
            await _fail(
                db,
                row,
                experiment,
                f"no file at {row.uri} after {settings.output_wait_minutes} min",
            )
        else:
            row.state = OutputState.WAITING_FOR_FILE
            row.next_attempt_at = now + timedelta(seconds=30)
            await db.commit()
        return False

    stable = timedelta(seconds=settings.output_stable_seconds)
    if size != row.size_bytes or row.size_seen_at is None:
        row.size_bytes, row.size_seen_at = size, now
        row.state = OutputState.WAITING_FOR_FILE
        row.next_attempt_at = now + stable
        await db.commit()
        return False
    if now - row.size_seen_at < stable:
        row.next_attempt_at = row.size_seen_at + stable
        await db.commit()
        return False

    row.state = OutputState.INDEXING
    await db.commit()
    try:
        blob, quality = await asyncio.to_thread(_index_sync, storage, reader, row, size)
    except Exception as exc:  # noqa: BLE001 - one bad file must not stop the worker
        row.attempts += 1
        row.error = f"{type(exc).__name__}: {exc}"[:2000]
        log.warning(
            "outputs.index_failed",
            experiment_id=str(row.experiment_id),
            attempt=row.attempts,
            error=row.error,
        )
        if row.attempts >= settings.output_index_max_attempts:
            await _fail(db, row, experiment, row.error)
        else:
            row.state = OutputState.PENDING
            row.next_attempt_at = now + timedelta(minutes=2**row.attempts)
            await db.commit()
        return False
    await _ready(db, row, experiment, blob, quality, size)
    log.info(
        "outputs.indexed",
        experiment_id=str(row.experiment_id),
        size_bytes=size,
        index_bytes=len(blob),
    )
    return True


async def _ready(
    db: AsyncSession,
    row: ExperimentOutput,
    experiment: Experiment | None,
    blob: bytes,
    quality: dict[str, object],
    size: int,
) -> None:
    row.chunk_index = blob
    row.report = quality
    row.parser_version = PARSER_VERSION
    row.state = OutputState.READY
    row.indexed_at = datetime.now(UTC)
    row.error = None
    if experiment is not None and experiment.status is ExperimentStatus.COPYING_RESULTS:
        experiment.status = ExperimentStatus.COMPLETED
        experiment.completed_at = row.indexed_at
        await emit(
            db,
            experiment,
            "experiment.status_changed",
            previous_status=ExperimentStatus.COPYING_RESULTS.value,
            size_bytes=size,
        )
    elif experiment is not None:  # re-indexed
        await emit(db, experiment, "experiment.outputs_ready", size_bytes=size)
    await db.commit()


async def _fail(
    db: AsyncSession, row: ExperimentOutput, experiment: Experiment | None, error: str
) -> None:
    row.state = OutputState.FAILED
    row.error = error
    if experiment is not None and experiment.status is ExperimentStatus.COPYING_RESULTS:
        experiment.status = ExperimentStatus.FAILED
        experiment.error = f"results: {error}"
        await emit(
            db,
            experiment,
            "experiment.status_changed",
            previous_status=ExperimentStatus.COPYING_RESULTS.value,
            error=experiment.error,
        )
    elif experiment is not None:  # a re-index of completed results failed
        await emit(db, experiment, "experiment.outputs_failed", error=error)
    await db.commit()
