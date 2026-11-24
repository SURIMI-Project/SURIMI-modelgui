"""Scenario names, simulation contracts and scenario catalogs, cached.

All change only when the controller is redeployed, while every experiment form
and validation reads them, so they are cached for CATALOG_CACHE_SECONDS. One
lock per key means a burst of requests after expiry makes one controller call.
A scenario catalog (ADR 0017) is rebuilt from the catalog file, the contract and
the `species` rows of its codes (ADR 0023) each time the contract is fetched, so
drift is logged once per refresh.

The initial HCR data (`GetInitialHCRData`: initial biomass and F, default
rule) is **not** cached and not part of the catalog: it changes whenever
Ecopath's file is regenerated, so each request asks the controller (ADR 0027).
`name_entries` adds the catalog's names and groups to its entries.
"""

from __future__ import annotations

import asyncio
import time
from collections.abc import Awaitable, Callable, Mapping, Sequence
from typing import Any, TypeVar

import structlog

from surimi_backend.catalog.scenario_catalog import (
    EntryNames,
    ScenarioCatalogFile,
    build_catalog,
    name_entries,
    species_codes,
)
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
        catalog_files: Mapping[str, ScenarioCatalogFile] | None = None,
        species: SpeciesLookup | None = None,
    ) -> None:
        self._controller = controller
        self._ttl = ttl_seconds
        self._files = dict(catalog_files or {})
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
            file = self._files.get(scenario_name)
            names = (
                await self._species.get(species_codes(contract, file)) if self._species else None
            )
            catalog = build_catalog(scenario_name, contract, file, names)
            log.info(
                "catalog.built",
                scenario=scenario_name,
                status=catalog.status,
                groups=len(catalog.functional_groups),
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
        codes = {code for code, _ in entries}
        names = await self._species.get(codes) if self._species else {}
        if self._species:
            unnamed = sorted(codes - names.keys())
            if unnamed:
                log.warning(
                    "catalog.drift",
                    scenario=scenario_name,
                    detail=f"initial HCR data with no species row: {', '.join(unnamed)}",
                )
        return name_entries(self._files.get(scenario_name), names, entries)

    async def require_scenario(self, scenario_name: str) -> None:
        """404 unless the controller lists the scenario."""
        if scenario_name not in await self.scenario_names():
            raise NotFoundError(f"scenario {scenario_name!r} does not exist")

    def file_codes(self) -> set[str]:
        """Species codes the catalog files name: group members, HCR-eligible."""
        codes: set[str] = set()
        for file in self._files.values():
            codes |= {m.species_code for g in file.functional_groups for m in g.members}
            codes |= {r.species_code for r in file.hcr_eligible}
        return codes

    def clear(self) -> None:
        self._values.clear()
