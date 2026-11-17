"""Retention purge against PostgreSQL (ADR 0013;
docs/features/observability-and-activity § Retention)."""

from __future__ import annotations

import asyncio
import uuid
from collections.abc import Callable
from datetime import UTC, datetime, timedelta
from typing import Any

import pytest
from prometheus_client import REGISTRY

from surimi_backend.core.config import Settings
from surimi_backend.core.db import create_engine, create_sessionmaker
from surimi_backend.observability.retention import purge_retention
from surimi_backend.users.models import User

pytestmark = pytest.mark.integration

NOW = datetime(2026, 11, 17, 12, 0, tzinfo=UTC)


def ago(days: float) -> datetime:
    return NOW - timedelta(days=days)


def purge(settings: Settings) -> dict[str, int]:
    async def go() -> dict[str, int]:
        engine = create_engine(settings)
        try:
            return await purge_retention(create_sessionmaker(engine), settings, now=NOW)
        finally:
            await engine.dispose()

    return asyncio.run(go())


def sign_in(sql: Callable[..., list[Any]], user: User | None, at: datetime, result: str) -> None:
    sql(
        "INSERT INTO login_events (user_id, method, result, ip, user_agent, at) VALUES"
        " (:u, 'password', CAST(:r AS login_result), '192.0.2.1', 'agent', :at)",
        u=user.id if user else None,
        r=result,
        at=at,
    )


def session(
    sql: Callable[..., list[Any]], user: User, expires: datetime, revoked: datetime | None = None
) -> uuid.UUID:
    sid = uuid.uuid4()
    sql(
        "INSERT INTO sessions (id, user_id, method, refresh_token_hash, expires_at,"
        " absolute_expires_at, revoked_at) VALUES (:id, :u, 'password', :h, :e, :e, :r)",
        id=sid,
        u=user.id,
        h=uuid.uuid4().hex,
        e=expires,
        r=revoked,
    )
    return sid


def experiment(sql: Callable[..., list[Any]], user: User, deleted: datetime | None) -> uuid.UUID:
    eid = uuid.uuid4()
    sql(
        "INSERT INTO experiments (id, owner_id, name, scenario_name, request, protocol_version,"
        " status, is_mse_run, pods_required, finished_at, deleted_at) VALUES (:id, :u, 'run',"
        " 'northwestern_med', '{}'::jsonb, '1.4.0', 'completed', false, 1, :d, :d)",
        id=eid,
        u=user.id,
        d=deleted,
    )
    sql(
        "INSERT INTO experiment_events (experiment_id, owner_id, type, data)"
        " VALUES (:id, :u, 'experiment.queued', '{}'::jsonb)",
        id=eid,
        u=user.id,
    )
    return eid


@pytest.fixture
def rows(users: Callable[..., User], sql: Callable[..., list[Any]]) -> dict[str, Any]:
    maria = users("maria")
    sql("DELETE FROM login_events")  # none from create_user, but be explicit
    sql("DELETE FROM audit_events")  # user.created by the fixture
    sql(
        "INSERT INTO login_stats_monthly (user_id, month, method, successes, failures)"
        " VALUES (:u, '2025-06-01', 'password', 10, 0)",
        u=maria.id,
    )
    sign_in(sql, maria, datetime(2025, 6, 3, tzinfo=UTC), "success")  # 532 days: rolled up
    sign_in(sql, maria, datetime(2025, 6, 4, tzinfo=UTC), "bad_credentials")
    sign_in(sql, maria, datetime(2025, 7, 1, tzinfo=UTC), "success")
    sign_in(sql, None, datetime(2025, 6, 5, tzinfo=UTC), "bad_credentials")  # unknown login
    sign_in(sql, maria, ago(100), "success")  # IP and agent removed, row kept
    sign_in(sql, maria, ago(10), "success")  # untouched
    for days in (800, 100):
        sql(
            "INSERT INTO audit_events (action, target_type, target_id, at)"
            " VALUES ('user.created', 'user', 'x', :at)",
            at=ago(days),
        )
    return {
        "maria": maria,
        "expired_long_ago": session(sql, maria, ago(40)),
        "revoked_long_ago": session(sql, maria, ago(-5), revoked=ago(31)),
        "revoked_lately": session(sql, maria, ago(-5), revoked=ago(10)),
        "active": session(sql, maria, ago(-5)),
        "old_deleted": experiment(sql, maria, ago(400)),
        "lately_deleted": experiment(sql, maria, ago(10)),
        "kept": experiment(sql, maria, None),
    }


def test_every_step_applies_its_period_and_a_second_run_does_nothing(
    db_settings: Settings, rows: dict[str, Any], sql: Callable[..., list[Any]]
) -> None:
    before = (
        REGISTRY.get_sample_value(
            "surimi_retention_rows_total", {"table": "login_events", "action": "rolled_up"}
        )
        or 0
    )
    assert purge(db_settings) == {
        "login_events_rolled_up": 4,
        "login_ips_nulled": 1,
        "login_user_agents_nulled": 1,
        "audit_events_deleted": 1,
        "sessions_deleted": 2,
        "deleted_experiments_purged": 1,
    }
    after = REGISTRY.get_sample_value(
        "surimi_retention_rows_total", {"table": "login_events", "action": "rolled_up"}
    )
    assert after == before + 4

    months = sql("SELECT month::text, successes, failures FROM login_stats_monthly ORDER BY month")
    # June 2025 added to the row already there; the unknown login is not kept.
    assert [tuple(r) for r in months] == [("2025-06-01", 11, 1), ("2025-07-01", 1, 0)]
    left = sql("SELECT ip IS NULL, user_agent IS NULL FROM login_events ORDER BY at")
    assert [tuple(r) for r in left] == [(True, True), (False, False)]
    assert sql("SELECT count(*) FROM audit_events")[0][0] == 1

    sessions = {r[0] for r in sql("SELECT id FROM sessions")}
    assert sessions == {rows["revoked_lately"], rows["active"]}
    experiments = {r[0] for r in sql("SELECT id FROM experiments")}
    assert experiments == {rows["lately_deleted"], rows["kept"]}
    events = sql(
        "SELECT count(*) FROM experiment_events WHERE experiment_id = :id", id=rows["old_deleted"]
    )
    assert events[0][0] == 0  # cascaded

    assert set(purge(db_settings).values()) == {0}


def test_zero_keeps_rows_forever(
    db_settings: Settings, rows: dict[str, Any], sql: Callable[..., list[Any]]
) -> None:
    keep = db_settings.model_copy(
        update={
            "retention_login_events_days": 0,
            "retention_audit_days": 0,
            "retention_sessions_days": 0,
            "retention_deleted_experiments_days": 0,
        }
    )
    assert purge(keep) == {"login_ips_nulled": 5, "login_user_agents_nulled": 5}
    assert sql("SELECT count(*) FROM login_events")[0][0] == 6
    assert sql("SELECT count(*) FROM audit_events")[0][0] == 2
    assert sql("SELECT count(*) FROM experiments")[0][0] == 3


def test_the_leader_purges_once_per_interval(
    db_settings: Settings, rows: dict[str, Any], monkeypatch: pytest.MonkeyPatch
) -> None:
    from surimi_backend.integrations.controller import FakeControllerClient
    from surimi_backend.scheduler import worker as worker_module

    calls: list[Settings] = []

    async def fake_purge(_: Any, settings: Settings) -> dict[str, int]:
        calls.append(settings)
        return {}

    monkeypatch.setattr(worker_module, "purge_retention", fake_purge)
    worker = worker_module.Worker(db_settings, controller=FakeControllerClient())

    async def go() -> None:
        try:
            await worker.purge_if_due()  # first cycle as leader: at once
            await worker.purge_if_due()  # not due for RETENTION_PURGE_INTERVAL_HOURS
            worker.next_purge = 0.0  # what a new term as leader does
            await worker.purge_if_due()
        finally:
            await worker.engine.dispose()

    asyncio.run(go())
    assert len(calls) == 2
