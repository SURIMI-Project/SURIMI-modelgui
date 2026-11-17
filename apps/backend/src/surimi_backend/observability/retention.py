"""Retention purge (ADR 0013; docs/features/observability-and-activity § Retention).

Run by the worker leader at its first cycle as leader and then every
RETENTION_PURGE_INTERVAL_HOURS. Each step is idempotent and commits on its own,
so a failed step neither undoes nor blocks the others; it is repeated at the
next run. A period of 0 keeps rows forever and skips that step (for IP and
user agent, 0 means the field is never stored at all).
"""

from __future__ import annotations

import time
from collections.abc import Callable
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta

import structlog
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from surimi_backend.core.config import Settings
from surimi_backend.observability import metrics

log = structlog.get_logger("surimi.retention")


@dataclass(frozen=True, slots=True)
class Step:
    name: str  # key in the result and the log line
    table: str  # metric label
    action: str  # metric label: rolled_up, nulled, deleted
    days: Callable[[Settings], int]
    sql: str  # :cutoff is bound; returns the rows touched


# Sign-ins of known users older than the limit are added to their month (UTC),
# then every row older than the limit is deleted, in one transaction. A failed
# attempt that matched no user has no user_id and is not kept in the roll-up.
_ROLL_UP_SIGN_INS = """
WITH moved AS (
    DELETE FROM login_events WHERE at < :cutoff
    RETURNING user_id, at, method, result
), months AS (
    INSERT INTO login_stats_monthly (user_id, month, method, successes, failures)
    SELECT user_id, date_trunc('month', at AT TIME ZONE 'UTC')::date, method,
           count(*) FILTER (WHERE result = 'success'),
           count(*) FILTER (WHERE result <> 'success')
    FROM moved WHERE user_id IS NOT NULL
    GROUP BY 1, 2, 3
    ON CONFLICT (user_id, month, method) DO UPDATE
        SET successes = login_stats_monthly.successes + EXCLUDED.successes,
            failures = login_stats_monthly.failures + EXCLUDED.failures
)
SELECT count(*) FROM moved
"""

STEPS = (
    Step(
        "login_events_rolled_up",
        "login_events",
        "rolled_up",
        lambda s: s.retention_login_events_days,
        _ROLL_UP_SIGN_INS,
    ),
    Step(
        "login_ips_nulled",
        "login_events",
        "nulled_ip",
        lambda s: s.retention_login_ip_days,
        "WITH done AS (UPDATE login_events SET ip = NULL"
        " WHERE ip IS NOT NULL AND at < :cutoff RETURNING 1) SELECT count(*) FROM done",
    ),
    Step(
        "login_user_agents_nulled",
        "login_events",
        "nulled_user_agent",
        lambda s: s.retention_login_user_agent_days,
        "WITH done AS (UPDATE login_events SET user_agent = NULL"
        " WHERE user_agent IS NOT NULL AND at < :cutoff RETURNING 1) SELECT count(*) FROM done",
    ),
    Step(
        "audit_events_deleted",
        "audit_events",
        "deleted",
        lambda s: s.retention_audit_days,
        "WITH done AS (DELETE FROM audit_events WHERE at < :cutoff RETURNING 1)"
        " SELECT count(*) FROM done",
    ),
    Step(
        "sessions_deleted",
        "sessions",
        "deleted",
        lambda s: s.retention_sessions_days,
        "WITH done AS (DELETE FROM sessions WHERE revoked_at < :cutoff"
        " OR expires_at < :cutoff OR absolute_expires_at < :cutoff RETURNING 1)"
        " SELECT count(*) FROM done",
    ),
    # Simulations, events and the output index go with them (ON DELETE CASCADE);
    # clones keep their own rows (cloned_from_id SET NULL). Files in the bucket stay.
    Step(
        "deleted_experiments_purged",
        "experiments",
        "deleted",
        lambda s: s.retention_deleted_experiments_days,
        "WITH done AS (DELETE FROM experiments WHERE deleted_at < :cutoff RETURNING 1)"
        " SELECT count(*) FROM done",
    ),
)


async def purge_retention(
    sessionmaker: async_sessionmaker[AsyncSession],
    settings: Settings,
    *,
    now: datetime | None = None,
) -> dict[str, int]:
    """Rows touched per step; a skipped (0 days) or failed step is not in the result."""
    now = now or datetime.now(UTC)
    started = time.perf_counter()
    done: dict[str, int] = {}
    failed: list[str] = []
    for step in STEPS:
        days = step.days(settings)
        if days <= 0:
            continue
        try:
            async with sessionmaker() as db:
                rows = int(
                    (
                        await db.execute(text(step.sql), {"cutoff": now - timedelta(days=days)})
                    ).scalar_one()
                )
                await db.commit()
        except Exception:
            failed.append(step.name)
            log.exception("retention.step_failed", step=step.name)
            continue
        done[step.name] = rows
        if rows:
            metrics.RETENTION_ROWS.labels(step.table, step.action).inc(rows)
    log.info(
        "retention.purged",
        **done,
        failed=failed or None,
        ms=round((time.perf_counter() - started) * 1000),
    )
    return done
