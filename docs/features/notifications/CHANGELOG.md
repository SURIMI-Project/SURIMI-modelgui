# Notifications — changelog

Every change made for this feature, newest first. Each entry says what changed,
where, how it was checked and what deploying it needs. Design is in
[README.md](README.md).

---

## 2026-11-13 — `simulation.status_changed`

- New event type: one per change of a simulation's state, and its first
  report, with `data.simulation` and the experiment's counts in
  `data.simulations`. `experiment.status_changed` carries the counts too.
  Written by `scheduler/poller.py`. An MSE run writes about 20.
- `experiments/models.py`: a comment still said "SSE replay"; now the events
  feed (ADR 0021).
- **Verified** 2026-11-13: Ruff, format, mypy strict clean; 239 tests pass (integration tests on PostgreSQL 17 in Docker).

---

## 2026-11-12 — Polling instead of SSE

**Status:** built (backend). [ADR 0021](../../decisions/0021-notifications-by-polling.md)
supersedes ADR 0008, at the user's request.

- `GET /api/v1/events` now answers JSON `{events, last_id, has_more,
  poll_after_seconds}`: no `after` gives only the cursor; `?after=<id>` gives
  newer events oldest first, `?limit` 1 to 500 (default 100). Scope as before.
- Removed: `notifications/broker.py` (the `LISTEN experiment_events` fan-out),
  the `NOTIFY experiment_events` in `experiments/events.py`, the settings
  `SSE_HEARTBEAT_SECONDS`, `SSE_REPLAY_MAX_EVENTS`, `SSE_REPLAY_MAX_HOURS`.
  `NOTIFY surimi_dispatch` (API → worker) is unchanged.
- Files: `notifications/router.py`, `notifications/__init__.py`, `main.py`,
  `experiments/events.py`, `core/config.py`; test
  `tests/test_experiments.py::test_events_are_polled_from_a_cursor_and_scoped`
  (cursor start, new events only, member vs admin scope, `limit` and
  `has_more`) replaces the SSE replay test.
- **Verified** 2026-11-12: Ruff, format, mypy strict clean; 235 tests pass
  (integration tests on PostgreSQL 17 in Docker).
- **Verified** 2026-11-12: a script polled the compose API (port 18082) the way
  a page will. It started from the cursor (`last_id` 9), then asked
  `?after=<last_id>&scope=mine` every `poll_after_seconds` (10). It received
  events 10 to 15 for run `efe96165`, in order: `queued`, `submitted`,
  `initialising`, `running`, `copying_results`, `completed`. Each arrived
  within 10 s of being written. Not tried from a browser or through nginx (no
  frontend until phase 10).
- Deploy: remove the three `SSE_*` variables from the environment if set.

---

## 2026-11-06 — SSE stream with replay

**Status:** built (phase 5, backend). Ruff, Ruff format and mypy strict clean; 229 tests pass, of them 61 new (integration tests against PostgreSQL 17 in Docker). `tests/test_experiments.py`
checks replay visibility (a member gets only their events) and the event
format. The live stream was not exercised in a browser (no frontend until
phase 10).

`apps/backend/…`: `notifications/broker.py` (one `LISTEN` per process,
reconnects), `notifications/router.py` (`GET /api/v1/events`, `scope`,
`Last-Event-ID`, heartbeat with a session check), `experiments/events.py`
(event row plus `NOTIFY` in one transaction).

No nginx change: the response carries `X-Accel-Buffering: no`.
