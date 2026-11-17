"""Controller statuses to our states, and an experiment's state from all its
simulations (docs/features/simulation-status-scheduler). Pure functions."""

from __future__ import annotations

from collections.abc import Iterable, Sequence
from datetime import datetime

from surimi_backend.experiments.models import ExperimentStatus, SimulationState

# The controller sets exactly these (SURIMI-controller a8a7f3a, SimulationManager).
STATUS_MAP = {
    "Initialising": SimulationState.INITIALISING,
    "Initialised": SimulationState.INITIALISED,
    "Running": SimulationState.RUNNING,
    "Finished": SimulationState.FINISHED,
    "Error": SimulationState.FAILED,
    "Canceled": SimulationState.CANCELLED,
}


def map_status(raw: str) -> SimulationState:
    return STATUS_MAP.get(raw, SimulationState.UNKNOWN)


def derive(states: Sequence[SimulationState]) -> ExperimentStatus | None:
    """The experiment's status from all its simulations (an MSE run has
    several, run in parallel). None when no simulation is reported yet (stays
    `submitted`).

    The controller initialises every simulation in parallel and starts them
    together only when all are Initialised (SURIMI-controller `117e604`,
    `ExperimentManager.RunExperimentAsync`): so `initialised` means every one
    is, and one still Initialising keeps the experiment `initialising`."""
    if not states:
        return None
    s = set(states)
    # First rule that holds wins (the precedence in the feature README).
    rules = (
        (SimulationState.FAILED in s, ExperimentStatus.FAILED),
        # Done on the controller; the results still have to reach the bucket.
        (s == {SimulationState.FINISHED}, ExperimentStatus.COPYING_RESULTS),
        (s <= {SimulationState.FINISHED, SimulationState.CANCELLED}, ExperimentStatus.CANCELLED),
        (SimulationState.RUNNING in s, ExperimentStatus.RUNNING),
        (
            bool(s & {SimulationState.INITIALISING, SimulationState.UNKNOWN}),
            ExperimentStatus.INITIALISING,
        ),
    )
    return next((status for holds, status in rules if holds), ExperimentStatus.INITIALISED)


def counts(states: Iterable[SimulationState]) -> dict[str, int]:
    """How many simulations are in each state, in lifecycle order, zeros left out."""
    seen = list(states)
    return {state.value: n for state in SimulationState if (n := seen.count(state))}


def progress(
    windows: Iterable[tuple[datetime | None, datetime | None, datetime | None, SimulationState]],
) -> float | None:
    """Mean over simulations of (current - start) / (end - start), 0..1.
    A finished simulation counts 1."""
    values: list[float] = []
    for start, end, current, state in windows:
        if state is SimulationState.FINISHED:
            values.append(1.0)
            continue
        if start is None or end is None or current is None or end <= start:
            values.append(0.0)
            continue
        values.append(min(max((current - start) / (end - start), 0.0), 1.0))
    return sum(values) / len(values) if values else None
