# Experiment queue — changelog

Every change made for this feature, newest first. Each entry says what changed,
where, how it was checked and what deploying it needs. Design is in
[README.md](README.md).

---

## 2026-11-12 — `copying_results` frees capacity

**Status:** built (backend). A run in `copying_results` holds no pod (the
controller freed it at `Finished`) and is not in flight. The estimated start
uses the run time of `copying_results` and `completed` runs
(`experiments/repository.py::median_run`). **Verified** 2026-11-12:
`tests/test_experiments.py::test_a_run_from_queue_to_copying_results` checks
0 pods in use once the run is copying.

---

## 2026-11-06 — Queue in pods, dispatcher, queue views

**Status:** built (phase 5). Ruff, Ruff format and mypy strict clean; 229 tests pass, of them 61 new (integration tests against PostgreSQL 17 in Docker). `tests/test_queue_rules.py`: fair
order, head-of-line wait, per-user cap, pod counting with `Error` and
unreported runs, estimates. `tests/test_experiments.py`: with 5 pods held by
`Error` simulations nothing is dispatched until the fake controller restarts;
pause, resume, priority, the per-user queued limit.

**Verified** 2026-11-06 on `user-<developer>`: before the restart the admin
queue showed `pods_in_use 5, pods_free 0`, held by the unmanaged MSE run
`78c1e2a4…` with 5 `Error` simulations (`leaked: true`), the cause of the
"No available pods" the user saw. After the user restarted the services, a
submitted experiment was dispatched within the same second (woken by
`NOTIFY surimi_dispatch`).

Found while writing the tests: the README's worked example contradicted the
fair-share rule (C, with nothing in flight, comes before B); the example is
corrected.

`apps/backend/…`: `experiments/queue.py` (rules), `scheduler/dispatcher.py`,
`experiments/service.py` (positions, estimates, views), routes `/api/v1/queue`
and `/api/v1/admin/queue…`.

**Deploy:** set `ECOPATH_PODS` and `CONTROLLER_MSE_SIMULATIONS` to the
controller's `ECOPATH_NR_OF_PODS` and `NR_OF_MSE_RUNS` (5 on
`user-<developer>`, judging by the 5 pods its MSE run held; 10 and 5 on
`project-surimi`).
