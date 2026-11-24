"""In-memory stand-in for the controller (`CONTROLLER_MODE=fake`), for local
development and tests when no controller is reachable. It builds its answers
from the generated protobuf classes, so the JSON has the same shape as the real
controller's. Contracts are copies of the real ones in `fake_contracts/`,
written by `scripts/build_scenario_catalog.py --fake-contracts`; a scenario
without a copy gets a minimal contract.

`GetInitialHCRData` reads a copy of Ecopath's file,
`fake_initial_state/<scenario>/<scenario>_initial_hrc_data.csv` (SURIMI-Ecopath
`3819d2c`, `Includes/northwestern_med/`), with F = catch / biomass as Ecopath
computes it. A scenario without the file fails with the message the
`project-surimi` controller gives (verified 2026-11-23). Tests may set
`initial_hcr_overrides[scenario]` to change the answer.

Experiments run on a timeline and copy the real controller's pod rules
(SURIMI-controller `a8a7f3a`, read 2026-11-06):

- each simulation takes one Ecopath pod; an MSE experiment has
  `mse_simulations` simulations;
- with no free pod the simulation is **never created** (the controller logs
  "No available pods" and reports nothing), but the experiment id stays known;
- `Finished` and `Canceled` release the pod, `Error` keeps it;
- `RemoveExperiment` cancels only `Running` simulations and always succeeds.
"""

from __future__ import annotations

import csv
import io
import json
import uuid
from collections import Counter
from collections.abc import Callable, Sequence
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from pathlib import Path
from typing import Any

from surimi.v1 import simulation_pb2

from surimi_backend.integrations.controller.base import (
    ControllerError,
    ExperimentSubmission,
    InitialHcrData,
    SimulationStatus,
)
from surimi_backend.integrations.controller.convert import message_to_dict, timestamp

FAKE_PROTOCOL_VERSION = "fake"
FAKE_SCENARIOS = ("aegean_sea", "anchovy_bay", "northwestern_med")
FAKE_CONTRACTS_DIR = Path(__file__).parent / "fake_contracts"
FAKE_INITIAL_STATE_DIR = Path(__file__).parent / "fake_initial_state"
FAKE_START = datetime(2013, 1, 1, tzinfo=UTC)


@dataclass
class FakeSimulation:
    simulation_id: str
    experiment_id: str
    scenario_name: str
    order: int
    created_at: datetime
    end_date_time: datetime
    # Seconds after creation when this simulation is Initialised.
    initialised_after: float = 0.0
    # Set by RemoveExperiment, by fail(), or when the timeline ends.
    final_status: str | None = None
    final_at: datetime | None = None
    holds_pod: bool = True


def _utcnow() -> datetime:
    return datetime.now(UTC)


class FakeControllerClient:
    def __init__(
        self,
        scenarios: Sequence[str] = FAKE_SCENARIOS,
        *,
        pods: int = 10,
        mse_simulations: int = 5,
        init_seconds: float = 5.0,
        run_seconds: float = 60.0,
        init_stagger_seconds: float = 0.0,
        clock: Callable[[], datetime] = _utcnow,
    ) -> None:
        self.scenarios = list(scenarios)
        self.calls: Counter[str] = Counter()
        self.pods = pods
        self.mse_simulations = mse_simulations
        self.init_seconds = init_seconds
        self.run_seconds = run_seconds
        # Simulation i of an experiment is Initialised i * stagger seconds after the first.
        self.init_stagger_seconds = init_stagger_seconds
        self.clock = clock
        self.experiments: dict[str, list[FakeSimulation]] = {}
        self.submissions: dict[str, ExperimentSubmission] = {}
        # Replaces the file's answer for a scenario (tests of changing values).
        self.initial_hcr_overrides: dict[str, list[InitialHcrData]] = {}
        self._order = 0

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
        stored = FAKE_CONTRACTS_DIR / f"{scenario_name}.json"
        if stored.exists():
            contract: dict[str, Any] = json.loads(stored.read_text(encoding="utf-8"))
            return contract
        simulation = simulation_pb2.Simulation(
            case_study_name=scenario_name,
            start_date_time=timestamp(FAKE_START),
            maximum_end_date_time=timestamp(datetime(2030, 12, 1, tzinfo=UTC)),
            time_step="P1M",
        )
        return message_to_dict(simulation)

    async def get_initial_hcr_data(self, scenario_name: str) -> list[InitialHcrData]:
        self.calls["GetInitialHCRData"] += 1
        if scenario_name not in self.scenarios:
            raise ControllerError(f"unknown scenario {scenario_name!r}")
        if scenario_name in self.initial_hcr_overrides:
            return list(self.initial_hcr_overrides[scenario_name])
        name = f"{scenario_name}_initial_hrc_data.csv"
        path = FAKE_INITIAL_STATE_DIR / scenario_name / name
        if not path.exists():
            raise ControllerError(
                f"MinIO API responded with message=ecopath/{scenario_name}/{name}"
            )
        rows = csv.DictReader(io.StringIO(path.read_text(encoding="utf-8")))
        return [
            InitialHcrData(
                species_code=r["SpeciesCode"],
                life_stage=r["LifeStage"],
                length_class=r["LengthClass"],
                age=r["Age"],
                initial_biomass_kg=float(r["Biomass"]),
                initial_fishing_mortality=float(r["Catch"]) / float(r["Biomass"]),
                default_biomass_limit_kg=float(r["BiomassLimit"] or 0),
                default_biomass_base_kg=float(r["BiomassBase"] or 0),
                default_f_max=float(r["FMax"] or 0),
            )
            for r in rows
        ]

    # --- experiments -----------------------------------------------------------------

    def _pods_in_use(self) -> int:
        self._advance()
        return sum(
            1
            for sims in self.experiments.values()
            for s in sims
            if s.holds_pod and s.final_status in (None, "Error")
        )

    async def submit_experiment(self, submission: ExperimentSubmission) -> None:
        self.calls["SubmitExperiment"] += 1
        if submission.experiment_id in self.experiments:
            raise ControllerError(
                f"Experiment with Id {submission.experiment_id} is already submitteded"
            )
        if submission.scenario_name not in self.scenarios:
            raise ControllerError(f"unknown scenario {submission.scenario_name!r}")
        self.submissions[submission.experiment_id] = submission
        wanted = self.mse_simulations if submission.is_mse_run else 1
        free = self.pods - self._pods_in_use()
        sims: list[FakeSimulation] = []
        # Like the controller: simulations without a free pod are never created.
        for index in range(min(wanted, max(free, 0))):
            self._order += 1
            sims.append(
                FakeSimulation(
                    simulation_id=str(uuid.uuid4()),
                    experiment_id=submission.experiment_id,
                    scenario_name=submission.scenario_name,
                    order=self._order,
                    created_at=self.clock(),
                    end_date_time=submission.end_date_time,
                    initialised_after=self.init_seconds / 2 + index * self.init_stagger_seconds,
                )
            )
        self.experiments[submission.experiment_id] = sims

    async def remove_experiment(self, experiment_id: str) -> None:
        self.calls["RemoveExperiment"] += 1
        if experiment_id not in self.experiments:
            raise ControllerError(
                f"Experiment with Id {experiment_id} cannot be found and cannot cancel"
            )
        self._advance()
        for sim in self.experiments[experiment_id]:
            if self._raw_status(sim) == "Running":
                sim.final_status, sim.final_at, sim.holds_pod = "Canceled", self.clock(), False

    def fail(self, experiment_id: str) -> None:
        """Test hook: the experiment's unfinished simulations end in `Error`
        and keep their pods, as on the real controller."""
        for sim in self.experiments[experiment_id]:
            if sim.final_status is None:
                sim.final_status, sim.final_at = "Error", self.clock()

    def restart(self) -> None:
        """Test hook: the controller forgets everything, as after a restart."""
        self.experiments.clear()

    # --- statuses --------------------------------------------------------------------

    def _phase(self, sim: FakeSimulation) -> tuple[str, float]:
        """Status from the timeline, and progress 0..1 while running.

        Like the controller (SURIMI-controller `117e604`,
        `ExperimentManager.RunExperimentAsync`): the simulations of an
        experiment initialise in parallel, and none runs until all of them are
        Initialised; then they all run in parallel."""
        elapsed = (self.clock() - sim.created_at).total_seconds()
        if elapsed < sim.initialised_after:
            return "Initialising", 0.0
        siblings = self.experiments.get(sim.experiment_id, [sim])
        # The experiment services (CMSY, output creator, value chain) take the
        # other half of init_seconds after the last simulation is Initialised.
        run_after = max(s.initialised_after for s in siblings) + self.init_seconds / 2
        if elapsed < run_after:
            return "Initialised", 0.0
        running = elapsed - run_after
        if running < self.run_seconds:
            return "Running", running / self.run_seconds
        return "Finished", 1.0

    def _raw_status(self, sim: FakeSimulation) -> str:
        return sim.final_status or self._phase(sim)[0]

    def _advance(self) -> None:
        for sims in self.experiments.values():
            for sim in sims:
                if sim.final_status is None and self._phase(sim)[0] == "Finished":
                    sim.final_status, sim.final_at, sim.holds_pod = (
                        "Finished",
                        self.clock(),
                        False,
                    )

    def _status(self, sim: FakeSimulation) -> SimulationStatus:
        status = self._raw_status(sim)
        _, progress = self._phase(sim)
        if status in ("Finished",):
            progress = 1.0
        end = sim.end_date_time
        current = FAKE_START + (end - FAKE_START) * progress if status != "Initialising" else None
        if current is not None:
            current = current.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        return SimulationStatus(
            simulation_id=sim.simulation_id,
            experiment_id=sim.experiment_id,
            scenario_name=sim.scenario_name,
            status=status,
            start_date_time=FAKE_START,
            end_date_time=end,
            simulation_started=sim.created_at,
            simulation_duration=(sim.final_at or self.clock()) - sim.created_at
            if status != "Initialising"
            else timedelta(milliseconds=10),
            simulation_current=current,
            ecology_host=f"http://fake-ecopath-{sim.order % self.pods}:7890",
            order=sim.order,
        )

    async def get_simulation_statuses(
        self, experiment_ids: Sequence[str]
    ) -> list[SimulationStatus]:
        self.calls["GetSimulationStatuses"] += 1
        self._advance()
        return [self._status(s) for eid in experiment_ids for s in self.experiments.get(eid, [])]

    async def get_all_simulation_statuses(self) -> list[SimulationStatus]:
        self.calls["GetAllSimulationStatuses"] += 1
        self._advance()
        return [self._status(s) for sims in self.experiments.values() for s in sims]
