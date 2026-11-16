"""A world for experiment tests: the API, a fake controller on a clock the
tests move, and the worker's dispatch and poll steps against PostgreSQL."""

from __future__ import annotations

import asyncio
from collections.abc import Awaitable, Callable, Iterator
from datetime import UTC, datetime, timedelta
from typing import Any

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import AsyncSession

from surimi_backend.core.config import Settings
from surimi_backend.core.db import create_engine, create_sessionmaker
from surimi_backend.integrations.controller import FakeControllerClient
from surimi_backend.main import create_app
from surimi_backend.scheduler.dispatcher import dispatch
from surimi_backend.scheduler.poller import poll

RULES = [
    {
        "species_code": "HKE",
        "life_stage": "adult",
        "biomass_limit_kg": 4_000_000,
        "biomass_base_kg": 16_000_000,
        "f_max": 0.3,
    },
    {
        "species_code": "PIL",
        "life_stage": "adult",
        "biomass_limit_kg": 9_000_000,
        "biomass_base_kg": 30_000_000,
        "f_max": 0.25,
    },
]


def body(**changes: Any) -> dict[str, Any]:
    return {
        "name": "Hake and sardine to 2014",
        "scenario_name": "northwestern_med",
        "end_date_time": "2014-01-01T00:00:00Z",
        "is_mse_run": False,
        "climate_scenario": "RCP_4.5",
        "harvest_control_rules": RULES,
        **changes,
    }


class Clock:
    def __init__(self) -> None:
        self.now = datetime.now(UTC)

    def __call__(self) -> datetime:
        return self.now

    def advance(self, seconds: float) -> None:
        self.now += timedelta(seconds=seconds)


class World:
    """An API, a fake controller on a clock, and the worker's steps."""

    def __init__(
        self, settings: Settings, client: TestClient, fake: FakeControllerClient, clock: Clock
    ) -> None:
        self.settings, self.client, self.fake, self.clock = settings, client, fake, clock

    def run(self, step: Callable[[AsyncSession], Awaitable[int]]) -> int:
        async def go() -> int:
            engine = create_engine(self.settings)
            try:
                async with create_sessionmaker(engine)() as db:
                    return await step(db)
            finally:
                await engine.dispose()

        return asyncio.run(go())

    def dispatch(self) -> int:
        return self.run(lambda db: dispatch(db, self.fake, self.settings))

    def poll(self) -> int:
        return self.run(lambda db: poll(db, self.fake, self.settings))


@pytest.fixture
def make_world(db_settings: Settings, clean_db: None) -> Iterator[Callable[..., World]]:
    clients: list[TestClient] = []

    def make(pods: int = 10, **overrides: Any) -> World:
        settings = db_settings.model_copy(update={"ecopath_pods": pods, **overrides})
        clock = Clock()
        fake = FakeControllerClient(
            pods=pods, mse_simulations=5, init_seconds=10, run_seconds=100, clock=clock
        )
        client = TestClient(create_app(settings, controller=fake))
        client.__enter__()
        clients.append(client)
        return World(settings, client, fake, clock)

    yield make
    for client in clients:
        client.__exit__(None, None, None)
