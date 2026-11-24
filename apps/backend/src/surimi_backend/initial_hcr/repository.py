"""SQL for initial HCR data snapshots (ADR 0028). Snapshots are scenario data,
not anyone's own: no ownership scope here; experiments check theirs."""

from __future__ import annotations

import uuid
from collections.abc import Sequence
from datetime import datetime
from typing import Any

from sqlalchemy import Row, select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from surimi_backend.initial_hcr.models import InitialHcrSnapshot


async def insert_or_get(
    db: AsyncSession, scenario_name: str, content_hash: str, entries: list[dict[str, Any]]
) -> tuple[InitialHcrSnapshot, bool]:
    """The snapshot with this hash, and whether this call inserted it.
    Concurrent equal inserts wait on the unique index; the later ones insert
    nothing and find the first one's row."""
    inserted = await db.execute(
        insert(InitialHcrSnapshot)
        .values(
            id=uuid.uuid4(),
            scenario_name=scenario_name,
            content_hash=content_hash,
            entries=entries,
            entry_count=len(entries),
        )
        .on_conflict_do_nothing(
            index_elements=[InitialHcrSnapshot.scenario_name, InitialHcrSnapshot.content_hash]
        )
        .returning(InitialHcrSnapshot.id)
    )
    is_new = inserted.first() is not None
    found = await db.execute(
        select(InitialHcrSnapshot).where(
            InitialHcrSnapshot.scenario_name == scenario_name,
            InitialHcrSnapshot.content_hash == content_hash,
        )
    )
    return found.scalar_one(), is_new


async def summaries(
    db: AsyncSession, scenario_name: str
) -> Sequence[Row[uuid.UUID, str, int, datetime]]:
    """Every snapshot of a scenario, newest first, without the entries."""
    result = await db.execute(
        select(
            InitialHcrSnapshot.id,
            InitialHcrSnapshot.content_hash,
            InitialHcrSnapshot.entry_count,
            InitialHcrSnapshot.first_seen_at,
        )
        .where(InitialHcrSnapshot.scenario_name == scenario_name)
        .order_by(InitialHcrSnapshot.first_seen_at.desc(), InitialHcrSnapshot.id)
    )
    return result.all()


async def get(db: AsyncSession, snapshot_id: uuid.UUID) -> InitialHcrSnapshot | None:
    return await db.get(InitialHcrSnapshot, snapshot_id)
