"""The interface the rest of the backend uses to talk to the SURIMI controller,
whatever is behind it: the real gRPC service or the in-memory fake."""

from __future__ import annotations

from collections.abc import Sequence
from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Any, Protocol

from surimi_backend.core.errors import AppError


@dataclass(frozen=True, slots=True)
class SimulationStatus:
    """`surimi.v1.SimulationStatus`. `status` is the controller's own string
    (Initialising, Initialised, Running, Finished, Error, Canceled)."""

    simulation_id: str
    experiment_id: str
    scenario_name: str
    status: str
    start_date_time: datetime | None
    end_date_time: datetime | None
    simulation_started: datetime | None
    simulation_duration: timedelta | None
    simulation_current: datetime | None
    ecology_host: str
    order: int


@dataclass(frozen=True, slots=True)
class TargetFishingMortality:
    """One harvest control rule as the controller takes it: biomass in **kg**,
    the unit the backend stores and serves too (ADR 0022)."""

    species_code: str
    life_stage: str
    biomass_limit_kg: float
    biomass_base_kg: float
    f_max: float


@dataclass(frozen=True, slots=True)
class SpeciesValue:
    """One value per species from `GetInitialBiomasses` or
    `GetInitialFishingMortalities`. The species key is the full
    `surimi.v1.Species`; empty strings where the controller sends none. The
    controller states no unit (docs/ISSUES.md)."""

    species_code: str
    life_stage: str
    length_class: str
    age: str
    value: float


@dataclass(frozen=True, slots=True)
class ExperimentSubmission:
    """`surimi.v1.SubmitExperimentRequest`, in plain values."""

    experiment_id: str
    scenario_name: str
    end_date_time: datetime
    is_mse_run: bool
    climate_scenario: str
    target_fishing_mortalities: tuple[TargetFishingMortality, ...]


class ControllerClient(Protocol):
    async def get_protocol_version(self) -> str: ...

    async def get_scenario_names(self) -> list[str]: ...

    async def get_simulation_contract(self, scenario_name: str) -> dict[str, Any]:
        """`surimi.v1.Simulation` as protobuf JSON with the proto's field names."""
        ...

    async def get_initial_biomasses(self, scenario_name: str) -> list[SpeciesValue]:
        """Biomass per species at the end of the scenario's spin-up. The
        controller passes the call to an Ecopath pod without reserving it; a
        member of a functional group gets the group's biomass (SURIMI-Ecopath
        `88e1121`, `InitialStateFileService`)."""
        ...

    async def get_initial_fishing_mortalities(self, scenario_name: str) -> list[SpeciesValue]:
        """Initial F per species: catch of the last 12 spin-up months divided by
        the initial biomass. An F of 0 is sent as an absent field, read as 0."""
        ...

    async def get_simulation_statuses(
        self, experiment_ids: Sequence[str]
    ) -> list[SimulationStatus]: ...

    async def get_all_simulation_statuses(self) -> list[SimulationStatus]: ...

    async def submit_experiment(self, submission: ExperimentSubmission) -> None:
        """Returns as soon as the controller has the experiment; its simulations
        start in the background. A missing Ecopath pod is **not** reported
        here: the simulation is then never created (controller `a8a7f3a`,
        `SimulationDispatcher.DispatchAsync`). Never retried."""
        ...

    async def remove_experiment(self, experiment_id: str) -> None:
        """The controller's cancel. Stops only `Running` simulations and
        succeeds even when it stopped nothing. Never retried."""
        ...

    async def close(self) -> None: ...


class ControllerError(AppError):
    """The controller answered with an error we cannot do anything about."""

    status_code = 502
    code = "controller_error"


class ControllerUnavailableError(ControllerError):
    """Cannot reach the controller, or it does not serve the protocol."""

    code = "controller_unavailable"


class ControllerTimeoutError(ControllerError):
    status_code = 504
    code = "controller_timeout"
