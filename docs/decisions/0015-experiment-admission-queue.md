# 0015 — Experiments wait in a fair queue in our database and are submitted when enough Ecopath pods are free

**Status:** Proposed
**Date:** 2026-11-03
**Related:** [features/experiment-queue](../features/experiment-queue/README.md), [0007](0007-scheduler-worker-postgres-queue.md), [ARCHITECTURE.md § Controller behaviour](../ARCHITECTURE.md#controller-behaviour)

## Context

- Each simulation needs one Ecopath pod. `project-surimi` has 10. An MSE
  experiment has 5 simulations, a non-MSE experiment 1: at most 2 MSE
  experiments or 10 non-MSE ones at a time. **Confirmed by Rik, 2026-11-03**,
  and **Read from source** (`SURIMI-controller` `a8a7f3a`,
  `ECOPATH_NR_OF_PODS`, `NR_OF_MSE_RUNS`).
- The controller has no queue. **Confirmed by Rik.** Its protocol has no RPC
  for a queue, for free capacity or for pod counts: `ControllerService` has
  only `SubmitExperiment`, `RemoveExperiment`, `GetSimulationStatuses`,
  `GetAllSimulationStatuses`, `GetSimulationContract`, `GetProtocolVersion`
  and `GetScenarioNames`. **Read from source**, `buf.build/surimi/surimi-protocol`.
- When no pod is free, the error happens in the controller's background
  initialisation: `SubmitExperiment` has already returned OK, and the
  simulation stays `Initialising` for ever. **Read from source.** So the caller
  gets no error to react to.
- A simulation that ends in `Error` keeps its pod; only `Finished` and
  `Canceled` release it. **Read from source.**
- The controller reports every simulation it knows, including ones started by
  other clients, through `GetAllSimulationStatuses`.
- User, 2026-11-03: "for the scheduler and Ecopath we probably need a queue".
- ADR 0007 already gives us Procrastinate for internal jobs. That queue is FIFO
  and opaque to users; it is the wrong place for something users must see,
  reorder and cancel.

## Decision

Two queues, each for its own job:

1. **Job queue (Procrastinate, ADR 0007)** for internal work: polling,
   output indexing, purges. Unchanged.
2. **Experiment admission queue**, as state in the `experiments` table, counted
   in **pods**:
   - Each experiment carries `pods_required` = `CONTROLLER_MSE_SIMULATIONS`
     (5) if `is_mse_run`, else 1, stored when it is queued.
   - `POST /experiments` stores it as `queued` with `queued_at` and
     `priority` 0.
   - A worker task `dispatch_queue` runs every 10 s and right after any
     experiment ends, is cancelled or is queued.
   - **Pods in use** = number of simulations the controller reports (from
     `GetAllSimulationStatuses`) whose status is not `Finished` or
     `Canceled`, so `Error` and stuck `Initialising` count because they may
     hold a pod; **plus** `pods_required` of our experiments in `submitting`
     or `submitted` that the controller does not report yet.
   - **Free pods** = `ECOPATH_PODS` (10) − pods in use.
   - **Order (fair share):** owner with the fewest pods in use first, then
     higher `priority`, then oldest `queued_at`. The head of the queue is
     submitted only if its `pods_required` fits in the free pods. A smaller
     experiment further back may go first only if the head has waited less
     than `MAX_HEAD_WAIT` (30 min); after that nothing overtakes it. A user at
     `MAX_PODS_PER_USER` is skipped until one of theirs ends.
   - Rows are claimed with `SELECT … FOR UPDATE SKIP LOCKED` inside a
     Procrastinate lock, so two workers never submit the same experiment.
   - **Detecting a wrong count:** if a simulation of an experiment we just
     submitted is still `Initialising` after `INIT_TIMEOUT` (10 min), the
     experiment is flagged `stalled`, an event and a log line say "probably no
     Ecopath pod", and admins see it in the queue view. If the controller
     reports a different number of simulations than `pods_required`, the
     real number is stored and a warning logged, so a changed
     `NR_OF_MSE_RUNS` corrects itself.
   - **Cancel while queued** changes only our row; no controller call.
   - Admins can see the whole queue with the pods each run uses, change
     priority, and pause dispatching (`queue_paused` in `app_settings`).
   - Users see their queue position and an estimated start.

## Why

- **Pods, not experiments:** one MSE run uses five pods. Counting experiments
  would let three MSE runs in and one would hang without an error.
- **Count from the controller's own list:** it includes runs from Bruno or
  other clients and the pods leaked by `Error` runs, which our table cannot
  know.
- **No back-pressure on errors:** the controller does not return the
  "No available pods" error to the caller, so we must not over-submit in the
  first place; the stall flag catches the cases where the count was still
  wrong.
- **Head-of-line rule:** without it, a steady flow of 1-pod runs could keep an
  MSE run waiting for ever; with it, small runs may use spare pods for a while
  but cannot starve a big one.
- **A table, not a broker:** users and admins see, reorder and cancel it, and
  it survives restarts; the state lives in one place, so it cannot drift from
  a broker's copy (ADR 0007).
- **Fair share** stops one user who queues ten runs from blocking everyone.

## Alternatives considered

| Option | Why not |
| --- | --- |
| Submit immediately, let the controller cope | Over capacity, runs hang in `Initialising` with no error to the caller |
| Count experiments instead of pods | An MSE run takes five pods |
| Count only our own experiments | Misses runs from other clients and pods leaked by `Error` |
| Back-off on submit errors only | The controller returns no error when pods run out |
| One Procrastinate job per experiment with a concurrency limit | No position, priority, fairness or pod sizes; state in two places |
| RabbitMQ or Redis queue | A new service for something one table and one task do |
| Queue in the controller | The right place long term (Rik agrees a queue is a good idea); not available now |

## Consequences

- New `experiments` columns `pods_required`, `queued_at`, `priority`,
  `submit_attempts`; new state `queued` before `submitting`.
- `ECOPATH_PODS` and `CONTROLLER_MSE_SIMULATIONS` must match the controller's
  `ECOPATH_NR_OF_PODS` and `NR_OF_MSE_RUNS` per deployment (10 and 5 on
  `project-surimi`).
- `Error` runs keep their pods until the controller restarts, so capacity
  shrinks after each error; the admin queue view shows this. Fixing it is
  upstream ([ISSUES.md](../ISSUES.md)).
- If another client fills pods between our count and our submit, our run
  stalls; the stall flag makes that visible.
