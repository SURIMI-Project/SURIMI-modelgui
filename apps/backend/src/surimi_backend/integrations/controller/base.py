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


class ControllerClient(Protocol):
    async def get_protocol_version(self) -> str: ...

    async def get_scenario_names(self) -> list[str]: ...

    async def get_simulation_contract(self, scenario_name: str) -> dict[str, Any]:
        """`surimi.v1.Simulation` as protobuf JSON with the proto's field names."""
        ...

    async def get_simulation_statuses(
        self, experiment_ids: Sequence[str]
    ) -> list[SimulationStatus]: ...

    async def get_all_simulation_statuses(self) -> list[SimulationStatus]: ...

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
