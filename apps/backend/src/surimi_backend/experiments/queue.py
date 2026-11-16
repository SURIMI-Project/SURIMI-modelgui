"""Admission queue rules (ADR 0015), as pure functions so they can be tested
without a database or a controller.

- Capacity is counted in Ecopath pods: an MSE run takes
  CONTROLLER_MSE_SIMULATIONS, any other run 1.
- Fair order: the owner with the fewest pods in flight first, then higher
  priority, then the oldest.
- The head goes only if it fits. A smaller run further back may use spare pods
  first, but not once the head has waited MAX_HEAD_WAIT.
- A user at MAX_PODS_PER_USER waits until one of their runs ends (a single run
  larger than the cap still goes when they have nothing in flight).
"""

from __future__ import annotations

import uuid
from collections.abc import Iterable, Mapping, Sequence
from dataclasses import dataclass
from datetime import datetime, timedelta

# Controller statuses whose simulations no longer hold an Ecopath pod. Error
# keeps it (SURIMI-controller a8a7f3a: only Finalise and Cancel release it).
POD_FREE_STATUSES = frozenset({"Finished", "Canceled"})


@dataclass(frozen=True, slots=True)
class Waiting:
    id: uuid.UUID
    owner_id: uuid.UUID
    pods: int
    priority: int
    queued_at: datetime


def fair_order(queued: Iterable[Waiting], owner_pods: Mapping[uuid.UUID, int]) -> list[Waiting]:
    return sorted(queued, key=lambda w: (owner_pods.get(w.owner_id, 0), -w.priority, w.queued_at))


def plan_dispatch(
    queued: Sequence[Waiting],
    owner_pods: Mapping[uuid.UUID, int],
    free_pods: int,
    *,
    max_pods_per_user: int,
    max_head_wait: timedelta,
    now: datetime,
) -> list[Waiting]:
    """The runs to submit now, in order."""
    pods = dict(owner_pods)
    remaining = list(queued)
    chosen: list[Waiting] = []
    while remaining and free_pods > 0:
        order = fair_order(remaining, pods)
        allowed = [
            w
            for w in order
            if pods.get(w.owner_id, 0) == 0 or pods.get(w.owner_id, 0) + w.pods <= max_pods_per_user
        ]
        if not allowed:
            break
        head = allowed[0]
        if head.pods <= free_pods:
            pick = head
        elif now - head.queued_at >= max_head_wait:
            break  # the head has waited long enough: nothing overtakes it
        else:
            fits = [w for w in allowed[1:] if w.pods <= free_pods]
            if not fits:
                break
            pick = fits[0]
        chosen.append(pick)
        remaining.remove(pick)
        free_pods -= pick.pods
        pods[pick.owner_id] = pods.get(pick.owner_id, 0) + pick.pods
    return chosen


def pods_in_use(
    controller_statuses: Iterable[tuple[str, str]],
    ours_not_reported: Iterable[int],
) -> int:
    """`controller_statuses`: (experiment_id, status) of every simulation the
    controller knows, from any client. Everything not Finished or Canceled
    counts, including Error (leaked) and stuck Initialising. Plus the pods of
    our runs submitted but not reported yet."""
    held = sum(1 for _, status in controller_statuses if status not in POD_FREE_STATUSES)
    return held + sum(ours_not_reported)


def estimated_start(
    pods_before: int,
    pods_needed: int,
    pods_total: int,
    median_run: timedelta | None,
    now: datetime,
) -> datetime | None:
    """Rough: one median run per round of pods the run must wait for.
    `pods_before`: pods in flight plus those of the runs ahead in the queue.
    None when it fits now, or when no run of the same kind has finished yet."""
    if median_run is None or pods_total <= 0 or pods_before + pods_needed <= pods_total:
        return None
    rounds = -(-(pods_before + pods_needed - pods_total) // pods_total)  # ceil
    return now + median_run * rounds
