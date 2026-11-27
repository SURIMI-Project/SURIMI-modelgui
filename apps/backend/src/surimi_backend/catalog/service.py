"""Scenario names, simulation contracts and scenario catalogs, cached.

All change only when the controller is redeployed, while every experiment form
and validation reads them, so they are cached for CATALOG_CACHE_SECONDS. One
lock per key means a burst of requests after expiry makes one controller call.
A scenario catalog (ADR 0017, 0029) is rebuilt from the scenario's catalog
data (the `catalog_*` tables, ADR 0030), the contract and the `species` rows of
its codes (ADR 0023) each time the contract is fetched, so drift is logged once
per refresh. An admin import calls `clear` on the replica that served it;
other replicas follow within CATALOG_CACHE_SECONDS.

The initial HCR data (`GetInitialHCRData`: initial biomass and F, default
rule) is **not** cached and not part of the catalog: it changes whenever
Ecopath's file is regenerated, so each request asks the controller (ADR 0027).
`name_entries` adds the catalog's names and groups to its entries.
"""

from __future__ import annotations

import asyncio
import time
from collections.abc import Awaitable, Callable, Sequence
from typing import Any, TypeVar

import structlog

from surimi_backend.catalog.scenario_catalog import (
    EntryNames,
    build_catalog,
    name_entries,
    species_codes,
)
from surimi_backend.catalog.scenario_data import ScenarioData, ScenarioDataSource
from surimi_backend.catalog.schemas import ScenarioCatalogOut
from surimi_backend.catalog.species import SpeciesLookup
from surimi_backend.core.errors import NotFoundError
from surimi_backend.integrations.controller import ControllerClient, InitialHcrData

log = structlog.get_logger("surimi.catalog")

T = TypeVar("T")


class CatalogService:
    def __init__(
        self,
        controller: ControllerClient,
        ttl_seconds: float,
        scenario_data: ScenarioDataSource | None = None,
        species: SpeciesLookup | None = None,
    ) -> None:
        self._controller = controller
        self._ttl = ttl_seconds
        self._data = scenario_data
        self._species = species
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

    async def protocol_version(self) -> str:
        return await self._cached("protocol_version", self._controller.get_protocol_version)

    async def scenario_names(self) -> list[str]:
        return await self._cached("scenario_names", self._controller.get_scenario_names)

    async def contract(self, scenario_name: str) -> dict[str, Any]:
        await self.require_scenario(scenario_name)
        return await self._cached(
            f"contract:{scenario_name}",
            lambda: self._controller.get_simulation_contract(scenario_name),
        )

    async def scenario_catalog(self, scenario_name: str) -> ScenarioCatalogOut:
        contract = await self.contract(scenario_name)

        async def load() -> ScenarioCatalogOut:
            data = await self.scenario_data(scenario_name)
            names = (
                await self._species.get(species_codes(contract, data)) if self._species else None
            )
            catalog = build_catalog(scenario_name, contract, data, names)
            log.info(
                "catalog.built",
                scenario=scenario_name,
                status=catalog.status,
                groups=sum(s.kind == "functional_group" for s in catalog.species),
                species=len(catalog.species),
                hcr_eligible=sum(s.hcr_eligible for s in catalog.species),
            )
            for item in catalog.drift:
                log.warning("catalog.drift", scenario=scenario_name, detail=item)
            return catalog

        return await self._cached(f"catalog:{scenario_name}", load)

    async def initial_hcr_data(self, scenario_name: str) -> list[InitialHcrData]:
        """`GetInitialHCRData`, never cached (ADR 0027). 404 for an unknown
        scenario; a controller failure propagates as ControllerError."""
        await self.require_scenario(scenario_name)
        return await self._controller.get_initial_hcr_data(scenario_name)

    async def name_entries(
        self, scenario_name: str, entries: Sequence[tuple[str, str]]
    ) -> list[EntryNames]:
        """Names, group and eligibility of each `(species_code, life_stage)`
        (requirement 11 of plan 2026-11-23). A code with no `species` row gets
        no names and a `catalog.drift` warning, as in the catalog."""
        data = await self.scenario_data(scenario_name)
        group_codes = {g.code for g in data.groups} if data else set()
        codes = {code for code, _ in entries} - group_codes
        if data:
            codes |= data.member_codes()
        names = await self._species.get(codes) if self._species else {}
        if self._species:
            unnamed = sorted({code for code, _ in entries} - group_codes - names.keys())
            if unnamed:
                log.warning(
                    "catalog.drift",
                    scenario=scenario_name,
                    detail=f"initial HCR data with no species row: {', '.join(unnamed)}",
                )
        return name_entries(data, names, entries)

    async def scenario_data(self, scenario_name: str) -> ScenarioData | None:
        """The scenario's catalog data, read on each call (a few small
        primary-key reads); None when the catalog has none."""
        return await self._data.get(scenario_name) if self._data else None

    async def require_scenario(self, scenario_name: str) -> None:
        """404 unless the controller lists the scenario."""
        if scenario_name not in await self.scenario_names():
            raise NotFoundError(f"scenario {scenario_name!r} does not exist")

    async def catalog_codes(self) -> set[str]:
        """Species codes the catalog data names: group members, HCR-eligible."""
        return await self._data.codes_in_use() if self._data else set()

    def clear(self) -> None:
        self._values.clear()
