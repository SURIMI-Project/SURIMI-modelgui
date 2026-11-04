"""In-memory stand-in for the controller (`CONTROLLER_MODE=fake`), for local
development and tests when no controller is reachable. It builds its answers
from the generated protobuf classes, so the JSON has the same shape as the real
controller's."""

from __future__ import annotations

from collections import Counter
from collections.abc import Sequence
from datetime import UTC, datetime
from typing import Any

from surimi.v1 import simulation_pb2

from surimi_backend.integrations.controller.base import ControllerError, SimulationStatus
from surimi_backend.integrations.controller.convert import message_to_dict, timestamp

FAKE_PROTOCOL_VERSION = "fake"
FAKE_SCENARIOS = ("aegean_sea", "anchovy_bay", "northwestern_med")


class FakeControllerClient:
    def __init__(self, scenarios: Sequence[str] = FAKE_SCENARIOS) -> None:
        self.scenarios = list(scenarios)
        self.calls: Counter[str] = Counter()

    async def close(self) -> None:
        return None

    async def get_protocol_version(self) -> str:
        self.calls["GetProtocolVersion"] += 1
        return FAKE_PROTOCOL_VERSION

    async def get_scenario_names(self) -> list[str]:
        self.calls["GetScenarioNames"] += 1
        return list(self.scenarios)

    async def get_simulation_contract(self, scenario_name: str) -> dict[str, Any]:
        self.calls["GetSimulationContract"] += 1
        if scenario_name not in self.scenarios:
            raise ControllerError(f"unknown scenario {scenario_name!r}")
        simulation = simulation_pb2.Simulation(
            case_study_name=scenario_name,
            start_date_time=timestamp(datetime(2013, 1, 1, tzinfo=UTC)),
            maximum_end_date_time=timestamp(datetime(2030, 12, 1, tzinfo=UTC)),
            time_step="P1M",
        )
        return message_to_dict(simulation)

    async def get_simulation_statuses(
        self, experiment_ids: Sequence[str]
    ) -> list[SimulationStatus]:
        self.calls["GetSimulationStatuses"] += 1
        return []

    async def get_all_simulation_statuses(self) -> list[SimulationStatus]:
        self.calls["GetAllSimulationStatuses"] += 1
        return []
