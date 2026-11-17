"""Experiment counters and the worker leader's gauges, against PostgreSQL and
the fake controller (docs/features/observability-and-activity § Metrics)."""

from __future__ import annotations

import asyncio
from collections.abc import Callable

import pytest
from prometheus_client import REGISTRY

from surimi_backend.observability import metrics
from surimi_backend.scheduler.worker import Worker
from surimi_backend.users.models import User
from tests.conftest import bearer
from tests.world import World, body

pytestmark = pytest.mark.integration

SCENARIO = "northwestern_med"


def sample(name: str, **labels: str) -> float:
    return REGISTRY.get_sample_value(name, labels) or 0.0


def test_a_submitted_and_cancelled_run_is_counted_once(
    make_world: Callable[..., World], users: Callable[..., User]
) -> None:
    w = make_world()
    users("maria")
    h = bearer(w.client, "maria")
    submitted = sample("surimi_experiments_submitted_total", scenario=SCENARIO)
    cancelled = sample("surimi_experiments_ended_total", scenario=SCENARIO, status="cancelled")

    e = w.client.post("/api/v1/experiments", json=body(), headers=h).json()
    assert sample("surimi_experiments_submitted_total", scenario=SCENARIO) == submitted + 1
    w.dispatch()
    w.poll()
    assert w.client.post(f"/api/v1/experiments/{e['id']}/cancel", headers=h).status_code == 202
    for _ in range(3):  # later polls emit simulation events for the cancelled run
        w.clock.advance(5)
        w.poll()
    status = w.client.get(f"/api/v1/experiments/{e['id']}", headers=h).json()["status"]
    assert status == "cancelled"
    after = sample("surimi_experiments_ended_total", scenario=SCENARIO, status="cancelled")
    assert after == cancelled + 1


def test_the_leader_sets_the_gauges_and_clears_them(
    make_world: Callable[..., World], users: Callable[..., User]
) -> None:
    w = make_world()
    users("maria")
    h = bearer(w.client, "maria")
    for _ in range(2):
        w.client.post("/api/v1/experiments", json=body(), headers=h)
    w.client.post("/api/v1/experiments", json=body(is_mse_run=True), headers=h)
    w.dispatch()

    worker = Worker(w.settings, controller=w.fake)

    async def update() -> None:
        try:
            await worker.update_gauges()
        finally:
            await worker.engine.dispose()

    asyncio.run(update())
    active = {
        s: sample("surimi_experiments_active", status=s) for s in ("queued", "submitted", "running")
    }
    # The MSE run waits: 1 + 1 + 5 pods would pass MAX_PODS_PER_USER (5).
    assert active == {"queued": 1, "submitted": 2, "running": 0}
    assert sample("surimi_ecopath_pods_in_use") == 2  # a queued run holds no pod
    assert sample("surimi_experiments_stalled") == 0

    Worker.clear_gauges()
    assert REGISTRY.get_sample_value("surimi_experiments_active", {"status": "submitted"}) == 0
    assert sample("surimi_ecopath_pods_in_use") == 0
    assert metrics.WORKER_LEADER._value.get() == 0
