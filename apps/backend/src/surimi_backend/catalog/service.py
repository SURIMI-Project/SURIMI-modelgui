"""Scenario names and simulation contracts, cached.

Both change only when the controller is redeployed, while every experiment form
and validation reads them, so they are cached for CATALOG_CACHE_SECONDS. One
lock per key means a burst of requests after expiry makes one controller call.
"""

from __future__ import annotations

import asyncio
import time
from collections.abc import Awaitable, Callable
from typing import Any, TypeVar

from surimi_backend.core.errors import NotFoundError
from surimi_backend.integrations.controller import ControllerClient

T = TypeVar("T")


class CatalogService:
    def __init__(self, controller: ControllerClient, ttl_seconds: float) -> None:
        self._controller = controller
        self._ttl = ttl_seconds
        self._values: dict[str, tuple[float, Any]] = {}
        self._locks: dict[str, asyncio.Lock] = {}

    async def _cached(self, key: str, load: Callable[[], Awaitable[T]]) -> T:
        hit = self._values.get(key)
        if hit and hit[0] > time.monotonic():
            return hit[1]  # type: ignore[no-any-return]
        lock = self._locks.setdefault(key, asyncio.Lock())
        async with lock:
            hit = self._values.get(key)
            if hit and hit[0] > time.monotonic():
                return hit[1]  # type: ignore[no-any-return]
            value = await load()
            self._values[key] = (time.monotonic() + self._ttl, value)
            return value

    async def scenario_names(self) -> list[str]:
        return await self._cached("scenario_names", self._controller.get_scenario_names)

    async def contract(self, scenario_name: str) -> dict[str, Any]:
        if scenario_name not in await self.scenario_names():
            raise NotFoundError(f"scenario {scenario_name!r} does not exist")
        return await self._cached(
            f"contract:{scenario_name}",
            lambda: self._controller.get_simulation_contract(scenario_name),
        )

    def clear(self) -> None:
        self._values.clear()
