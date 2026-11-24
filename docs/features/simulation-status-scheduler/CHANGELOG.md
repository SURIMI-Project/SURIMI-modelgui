# Simulation status scheduler — changelog

Every change made for this feature, newest first. Each entry says what changed,
where, how it was checked and what deploying it needs. Design is in
[README.md](README.md).

---

## 2026-11-24 — Fix: the worker could not dispatch (`NoReferencedTableError`)

**Status:** fixed (backend). The dispatcher failed at every cycle on
`db.commit()` with `Foreign key associated with column
'experiments.initial_hcr_snapshot_id' could not find table
'initial_hcr_snapshots'`, so queued experiments stayed queued. Cause: the
worker process imports no routers, so `initial_hcr/models.py` (added
2026-11-23, migration `0008`) was never loaded, and SQLAlchemy could not
resolve the new foreign key when it flushed. The API was not affected (its
routers import every model).

- `scheduler/worker.py`: imports `surimi_backend.models`, the registry of every
  table, as `seed-species` already did.
- `tests/test_model_registry.py` (new): imports the worker module in a fresh
  interpreter and resolves every foreign key; the pytest process itself
  imports the whole app, which is why the existing tests missed it.

**Verified**, 2026-11-24: the new test fails without the fix and passes with
it; Ruff, format, mypy strict clean; 333 tests pass. **Not verified:** a
dispatch by a rebuilt worker container.

> **Deploying this:** rebuild and restart the `worker` image. No migration, no
> settings.

---

## 2026-11-13 — Status `initialised`; each simulation of a run followed

**Status:** built (backend). Asked by the user, 2026-11-13: show `initialised`
between `initialising` and `running`, and follow every simulation of a run,
since an MSE run has several in parallel.

- Controller behaviour, **Read from source**, SURIMI-controller `117e604`,
  `ExperimentManager.RunExperimentAsync`: the simulations initialise in
  parallel with the experiment services (CMSY, output creator, value chain);
  none runs until all are done; then all run in parallel.
- `ExperimentStatus.INITIALISED` (`experiments/models.py`), in the in-flight
  and polled states (it holds pods). `scheduler/derive.py`: all simulations
  `initialised` → `initialised`; any `initialising` or `unknown` →
  `initialising`; the rules are one ordered table. New `counts()`.
- `scheduler/poller.py`: `_upsert` returns which simulations are new or moved;
  each writes a `simulation.status_changed` event (simulation id, order,
  status, raw status, previous status, and the experiment's counts).
  `experiment.status_changed` carries the counts. The stall reason names the
  states: "2 of 5 simulation(s) not running after 10 min (2 initialising)".
- API: `simulation_counts` on every `ExperimentOut`
  (`repository.simulation_counts`, one grouped query per page); `progress` on
  each `SimulationOut`.
- Fake controller: `init_stagger_seconds`; simulations become Initialised one
  after another, and none runs until all are, plus half of `init_seconds` for
  the experiment services.
- Migration `0006_initialised`: enum value `initialised` before `running`;
  `experiments_in_flight_idx` recreated to cover it. **Verified** 2026-11-13 on
  the local compose database: upgrade, downgrade to `0005`, upgrade again; the
  index definition and the enum read back from PostgreSQL.
- Tests: `tests/test_queue_rules.py` (derive cases, counts),
  `tests/test_experiments.py::test_a_run_from_queue_to_copying_results` (passes
  through `initialised`; the full event sequence),
  `test_an_mse_run_follows_all_its_simulations` (5 simulations: 3 initialising
  and 2 initialised → `initialising`; all initialised → `initialised`; all
  running, each with progress; 20 simulation events).
- **Verified** 2026-11-13: Ruff, format, mypy strict clean; 239 tests pass (integration tests on PostgreSQL 17 in Docker).
- **Not verified live:** the `user-<developer>` controller stopped answering (HTTP 404 at its ingress) on 2026-11-13, so no run was seen in `initialised` from the real controller. An MSE run was not tried there: a failed one held all 5 pods until a restart on 2026-11-06.
- Deploy: run the `migrate` job (migration `0006`) before the new API and worker.

---

## 2026-11-12 — `copying_results` until the results are in the bucket, then `completed`

**Status:** built (backend). Asked by the user, 2026-11-12: a run the
controller reports `Finished` is not done until its results are in the bucket.

- Experiment statuses: `finished` renamed `completed`; new `copying_results`
  between `running` and `completed`. New column `experiments.completed_at`;
  `finished_at` keeps meaning when the run ended on the controller.
- Poller (`scheduler/poller.py`, `scheduler/derive.py`): all simulations
  `Finished` → `copying_results`, `finished_at`, progress 1, outputs row
  created. Not polled on the controller after that, no stall flags, holds no
  pod. A `cancelling` run that finished anyway also goes to `copying_results`.
- Outputs job (`outputs/indexer.py`): indexed → `completed` with
  `completed_at` (event `experiment.status_changed`); no file after
  `OUTPUT_WAIT_MINUTES` or unreadable after `OUTPUT_INDEX_MAX_ATTEMPTS` →
  `failed`, error `results: …`. Admin re-index of such a run
  (`outputs/router.py`) → `copying_results` again, and the wait counts from the
  re-index.
- Cancel of a `copying_results` run is refused (409, `experiments/service.py`);
  the queue's median run time counts `copying_results` and `completed` runs
  (`experiments/repository.py`).
- Migration `0005_results_and_hcr_bounds`: renames the enum value, adds
  `copying_results` and `completed_at`; existing `finished` runs become
  `completed` (outputs ready, `completed_at` = `indexed_at`),
  `copying_results` (outputs still pending) or `failed` (outputs failed).
- Tests: `tests/test_experiments.py` (run ends in `copying_results`, no pods
  held, cancel refused), `tests/test_outputs_api.py` (`completed` after
  indexing; missing file → `failed`, re-index → `copying_results` →
  `completed`), `tests/test_queue_rules.py` (derivation).
- **Verified** 2026-11-12: Ruff, format, mypy strict clean; 235 tests pass.
  Migration `0005` checked once by hand-run test against PostgreSQL 17: down to
  `0004` and up again with one experiment per output state, ending
  `completed`, `copying_results` and `failed` as above.
- **Verified** 2026-11-12 on the local compose stack (`user-<developer>`
  controller, bucket `oidc-<developer>`):
  - The `migrate` job ran `0005` on the real database: the two 2026-11-06
    runs with ready outputs became `completed`, with `completed_at` =
    `indexed_at`. The new checks are in `harvest_control_rules`.
  - A new run `efe96165` (`northwestern_med`, HKE and PIL adult, to 2014,
    non-MSE) went `queued` 21:32:03, `initialising` 21:32:14, `running`
    21:37:57, `copying_results` 21:41:29 (`finished_at`), and `completed`
    21:43:09 (`completed_at`, `.nc` of 19,839,057 bytes indexed). The worker
    logged `outputs.indexed` in the same cycle.
  - Afterwards the queue showed 0 pods in use.
  - Not seen: the `copying_results` → `failed` path against the bucket (the
    file always arrived; covered by tests).
- Deploy: run `surimi-backend migrate` (the `migrate` job) before the new API
  and worker start.

---

## 2026-11-06 — The worker: poll, dispatch, index, one leader

**Status:** built (phase 5). Procrastinate replaced by a row-driven loop with
a PostgreSQL advisory lock ([ADR 0019](../../decisions/0019-worker-row-driven-with-advisory-lock.md)).
Ruff, Ruff format and mypy strict clean; 229 tests pass, of them 61 new (integration tests against PostgreSQL 17 in Docker). `tests/test_queue_rules.py` (mapping and derivation),
`tests/test_experiments.py` (states over time, cancel retries, never-started
and lost experiments).

New rule from the controller source (`a8a7f3a`, read 2026-11-06) and a live
check: with no free pod the controller never creates the simulation and
reports nothing, so an experiment with no simulation after
`START_TIMEOUT_MINUTES` is `failed` with a message naming "No available
pods"; an MSE run with only some simulations started is `failed` too.

**Verified** 2026-11-06 with the compose `worker` against
`user-<developer>`: the adopted run `77c1e2a4…` was seen `Finished` within
one cycle and its outputs row created.

**Not built:** session purge and retention purges (phase 7);
`surimi_poll_*` metrics (phase 7).

`apps/backend/…`: `scheduler/` (`derive.py`, `poller.py`, `dispatcher.py`,
`worker.py`), `core/db.py` (`connect_raw`), `cli.py` (`worker`).

**Deploy:** compose service `worker` (same image, no HTTP port).
