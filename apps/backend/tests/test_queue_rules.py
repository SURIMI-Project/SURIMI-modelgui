"""Admission queue rules (ADR 0015) and status derivation, without a database."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime, timedelta

import pytest

from surimi_backend.experiments.models import ExperimentStatus, SimulationState
from surimi_backend.experiments.queue import (
    Waiting,
    estimated_start,
    fair_order,
    plan_dispatch,
    pods_in_use,
)
from surimi_backend.scheduler.derive import counts, derive, map_status, progress

NOW = datetime(2026, 11, 6, 12, tzinfo=UTC)
A, B, C = uuid.uuid4(), uuid.uuid4(), uuid.uuid4()


def waiting(owner: uuid.UUID, pods: int, minutes_ago: int, priority: int = 0) -> Waiting:
    return Waiting(uuid.uuid4(), owner, pods, priority, NOW - timedelta(minutes=minutes_ago))


def plan(
    queued: list[Waiting], owner_pods: dict[uuid.UUID, int], free: int, cap: int = 5
) -> list[Waiting]:
    return plan_dispatch(
        queued,
        owner_pods,
        free,
        max_pods_per_user=cap,
        max_head_wait=timedelta(minutes=30),
        now=NOW,
    )


def test_the_worked_example_of_the_feature_doc() -> None:
    # 10 pods; A has an MSE run (5) in flight, B one run (1), Bruno one (1): 3 free.
    b_mse = waiting(B, 5, 5)
    c_one = waiting(C, 1, 3)
    assert plan([b_mse, c_one], {A: 5, B: 1}, 3) == [c_one]
    # When B and C have as many pods in flight, B's older run is the head, and
    # once it has waited 30 min nothing overtakes it.
    b_old = waiting(B, 5, 31)
    assert plan([b_old, c_one], {A: 5, B: 1, C: 1}, 3, cap=10) == []
    b_young = waiting(B, 5, 29)
    assert plan([b_young, c_one], {A: 5, B: 1, C: 1}, 3, cap=10) == [c_one]
    # With the default cap of 5, B (1 in flight + 5) is skipped and C goes.
    assert plan([b_old, c_one], {A: 5, B: 1, C: 1}, 3) == [c_one]


def test_fair_share_goes_to_the_owner_with_fewest_pods_first() -> None:
    a1, a2, b1 = waiting(A, 1, 30), waiting(A, 1, 29), waiting(B, 1, 1)
    assert fair_order([a1, a2, b1], {A: 2}) == [b1, a1, a2]
    # Each dispatch counts: A and B alternate.
    assert plan([a1, a2, b1], {}, 3) == [a1, b1, a2]


def test_priority_then_age() -> None:
    old, urgent = waiting(A, 1, 10), waiting(A, 1, 1, priority=5)
    assert fair_order([old, urgent], {}) == [urgent, old]


def test_a_user_at_the_cap_waits_but_a_single_big_run_still_goes() -> None:
    a = waiting(A, 1, 5)
    assert plan([a], {A: 5}, 5, cap=5) == []
    mse = waiting(B, 5, 5)
    assert plan([mse], {}, 5, cap=3) == [mse]


def test_nothing_fits_when_every_pod_is_held() -> None:
    assert plan([waiting(A, 1, 1)], {}, 0) == []


def test_pods_in_use_counts_error_and_initialising_and_unreported_runs() -> None:
    statuses = [
        ("e1", "Error"), ("e1", "Error"), ("e2", "Initialising"), ("e3", "Running"),
        ("e4", "Finished"), ("e5", "Canceled"), ("e6", "Initialised"),
    ]  # fmt: skip
    assert pods_in_use(statuses, [5]) == 5 + 5


def test_estimated_start() -> None:
    assert estimated_start(0, 1, 10, timedelta(minutes=40), NOW) is None  # fits now
    assert estimated_start(9, 5, 10, None, NOW) is None  # no history
    assert estimated_start(9, 5, 10, timedelta(minutes=40), NOW) == NOW + timedelta(minutes=40)
    assert estimated_start(25, 1, 10, timedelta(minutes=40), NOW) == NOW + timedelta(minutes=80)


@pytest.mark.parametrize(
    ("raw", "state"),
    [
        ("Initialising", SimulationState.INITIALISING),
        ("Initialised", SimulationState.INITIALISED),
        ("Running", SimulationState.RUNNING),
        ("Finished", SimulationState.FINISHED),
        ("Error", SimulationState.FAILED),
        ("Canceled", SimulationState.CANCELLED),
        ("Cancelled", SimulationState.UNKNOWN),  # British spelling is not what it sends
    ],
)
def test_status_mapping(raw: str, state: SimulationState) -> None:
    assert map_status(raw) is state


@pytest.mark.parametrize(
    ("states", "expected"),
    [
        ([], None),
        ([SimulationState.FINISHED, SimulationState.FAILED], ExperimentStatus.FAILED),
        ([SimulationState.FINISHED] * 5, ExperimentStatus.COPYING_RESULTS),
        ([SimulationState.FINISHED, SimulationState.CANCELLED], ExperimentStatus.CANCELLED),
        ([SimulationState.RUNNING, SimulationState.INITIALISING], ExperimentStatus.RUNNING),
        (
            [SimulationState.INITIALISED, SimulationState.INITIALISING],
            ExperimentStatus.INITIALISING,
        ),
        ([SimulationState.INITIALISED] * 5, ExperimentStatus.INITIALISED),
        ([SimulationState.INITIALISED, SimulationState.UNKNOWN], ExperimentStatus.INITIALISING),
        ([SimulationState.RUNNING, SimulationState.CANCELLED], ExperimentStatus.RUNNING),
    ],
)
def test_derive(states: list[SimulationState], expected: ExperimentStatus | None) -> None:
    assert derive(states) is expected


def test_counts_follow_the_lifecycle_and_leave_out_zeros() -> None:
    states = [SimulationState.RUNNING, SimulationState.INITIALISED, SimulationState.RUNNING]
    assert list(counts(states).items()) == [("initialised", 1), ("running", 2)]
    assert counts([]) == {}


def test_progress_is_the_mean_over_simulations() -> None:
    start, end = datetime(2013, 1, 1, tzinfo=UTC), datetime(2015, 1, 1, tzinfo=UTC)
    half = datetime(2014, 1, 1, tzinfo=UTC)
    value = progress(
        [
            (start, end, half, SimulationState.RUNNING),
            (start, end, None, SimulationState.FINISHED),
        ]
    )
    assert value == pytest.approx((0.4993 + 1.0) / 2, abs=0.01)
    assert progress([]) is None
