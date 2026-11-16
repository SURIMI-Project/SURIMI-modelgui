"""The fake controller follows the real one's pod rules (SURIMI-controller
a8a7f3a, read 2026-11-06), and the request mapping."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta

import pytest

from surimi_backend.integrations.controller import (
    ControllerError,
    ExperimentSubmission,
    FakeControllerClient,
)
from surimi_backend.integrations.controller.mapping import to_submission


class Clock:
    def __init__(self) -> None:
        self.now = datetime(2026, 11, 6, 12, tzinfo=UTC)

    def __call__(self) -> datetime:
        return self.now

    def advance(self, seconds: float) -> None:
        self.now += timedelta(seconds=seconds)


def submission(eid: str, *, mse: bool = False) -> ExperimentSubmission:
    return ExperimentSubmission(
        eid, "northwestern_med", datetime(2014, 1, 1, tzinfo=UTC), mse, "", ()
    )


@pytest.fixture
def clock() -> Clock:
    return Clock()


@pytest.fixture
def fake(clock: Clock) -> FakeControllerClient:
    return FakeControllerClient(
        pods=5, mse_simulations=5, init_seconds=10, run_seconds=100, clock=clock
    )


async def statuses(fake: FakeControllerClient, eid: str) -> list[str]:
    return [s.status for s in await fake.get_simulation_statuses([eid])]


async def test_a_run_moves_through_every_state(fake: FakeControllerClient, clock: Clock) -> None:
    await fake.submit_experiment(submission("e1"))
    assert await statuses(fake, "e1") == ["Initialising"]
    clock.advance(6)
    assert await statuses(fake, "e1") == ["Initialised"]
    clock.advance(10)
    [running] = await fake.get_simulation_statuses(["e1"])
    assert running.status == "Running"
    assert running.simulation_current is not None
    clock.advance(200)
    assert await statuses(fake, "e1") == ["Finished"]


async def test_no_free_pod_means_no_simulation_at_all(fake: FakeControllerClient) -> None:
    await fake.submit_experiment(submission("mse", mse=True))  # takes all 5 pods
    await fake.submit_experiment(submission("late"))  # succeeds, like the real one
    assert await statuses(fake, "late") == []
    with pytest.raises(ControllerError, match="already submit"):
        await fake.submit_experiment(submission("late"))


async def test_error_keeps_its_pods_finish_frees_them(
    fake: FakeControllerClient, clock: Clock
) -> None:
    await fake.submit_experiment(submission("mse", mse=True))
    fake.fail("mse")
    await fake.submit_experiment(submission("blocked"))
    assert await statuses(fake, "blocked") == []
    fake.restart()
    await fake.submit_experiment(submission("after-restart"))
    assert await statuses(fake, "after-restart") == ["Initialising"]


async def test_remove_cancels_only_running(fake: FakeControllerClient, clock: Clock) -> None:
    await fake.submit_experiment(submission("e1"))
    await fake.remove_experiment("e1")  # still initialising: nothing happens
    assert await statuses(fake, "e1") == ["Initialising"]
    clock.advance(15)
    await fake.remove_experiment("e1")
    assert await statuses(fake, "e1") == ["Canceled"]


def test_mapping_passes_kg_through_with_the_contract_spelling() -> None:
    sub = to_submission(
        "e1",
        {
            "scenario_name": "northwestern_med",
            "end_date_time": "2014-01-01T00:00:00+00:00",
            "is_mse_run": False,
            "climate_scenario": "RCP_4.5",
            "harvest_control_rules": [
                {
                    "species_code": "HKE",
                    "life_stage": "adult",
                    "biomass_limit_kg": 4_000_500.0,
                    "biomass_base_kg": 16_000_000,
                    "f_max": 0.3,
                }
            ],
        },
    )
    [rule] = sub.target_fishing_mortalities
    assert (rule.biomass_limit_kg, rule.biomass_base_kg, rule.f_max) == (
        4_000_500.0,
        16_000_000.0,
        0.3,
    )
    assert (rule.species_code, rule.life_stage) == ("HKE", "adult")
    assert sub.climate_scenario == "RCP_4.5"
