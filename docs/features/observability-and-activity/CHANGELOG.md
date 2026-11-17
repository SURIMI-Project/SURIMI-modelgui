# Observability and user activity — changelog

Every change made for this feature, newest first. Each entry says what changed,
where, how it was checked and what deploying it needs. Design is in
[README.md](README.md).

---

## 2026-11-17 — Optional token on `/metrics`

**Status:** built (user's request: the API port may be exposed). Ruff,
Ruff format, mypy strict clean; `tests/test_metrics.py` 12 pass (3 new: the
API asks for the bearer token and refuses a missing, wrong or non-Bearer one;
the worker's server asks for the same; a token under 32 characters is
refused). **Verified** in compose (separate project): with `METRICS_TOKEN` the
API and the worker answered 401 without or with a wrong token and 200 with
it, and Prometheus scraped both; with no token set, scrapes still worked.

`apps/backend/src/surimi_backend/`:

- `core/config.py`, `startup.py` — `METRICS_TOKEN` (`SecretStr`, at least 32
  characters when set; shown as set or not set in the start-up log).
- `observability/metrics.py` — `authorized()` (constant-time compare);
  `/metrics` raises `401 not_authenticated` with `WWW-Authenticate: Bearer`;
  the worker serves `/metrics` from our own WSGI server with the same check,
  instead of `prometheus-client`'s `start_http_server`, which has no hook for it.

`deployments/`:

- `compose.yml` — `METRICS_TOKEN` for `api` and `worker`; `prometheus` writes
  it to `/tmp/metrics_token` before it starts (and now sets
  `--storage.tsdb.path=/prometheus` itself, as the image's own command did).
- `observability/prometheus/prometheus.yml` — `authorization` with that file.
- `.env.example` — `METRICS_TOKEN`.

`resources/bruno/surimi-modelgui/`: `api/get metrics.yml` sends
`Bearer {{metricsToken}}`; secret `metricsToken` in the `local`,
`alexiosgkikas` and `project-surimi` environments.

**Deploy:** set `METRICS_TOKEN` wherever the API port is reachable from
outside, and give the same value to the scraper.

---

## 2026-11-17 — Retention purge and the observability compose profile

**Status:** built (phase 7, steps 4 and 5). Ruff, Ruff format, mypy strict
clean; the whole suite passes, 318 tests, 118 integration (PostgreSQL 17 in
Docker). `tests/test_retention.py`: every step against rows dated in the past,
a second run touches nothing, 0 keeps rows, and the leader purges once per
interval. **Verified** in compose (a separate project, fake controller): Prometheus
scraped `api` and `worker`, Grafana provisioned the dashboard and both data
sources and every panel query ran, Jaeger received the traces of both services.

`apps/backend/`:

- `src/surimi_backend/observability/retention.py` — `purge_retention`: monthly
  roll-up and delete of old sign-ins, IP and user agent nulled, old audit
  events, ended sessions and soft-deleted experiments deleted; each step
  commits on its own; `retention.purged` log line, `surimi_retention_rows_total`.
- `src/surimi_backend/scheduler/worker.py` — the leader runs the purge at its
  first cycle and every `RETENTION_PURGE_INTERVAL_HOURS`.
- `src/surimi_backend/core/config.py`, `startup.py` — `RETENTION_PURGE_INTERVAL_HOURS`,
  `RETENTION_LOGIN_EVENTS_DAYS`, `RETENTION_AUDIT_DAYS`, `RETENTION_SESSIONS_DAYS`,
  `RETENTION_DELETED_EXPERIMENTS_DAYS`.

`deployments/`:

- `observability/prometheus/prometheus.yml` — scrapes every `api` and `worker`
  replica by DNS discovery.
- `observability/grafana/` — data sources (Prometheus, Jaeger), dashboard
  provider, starter dashboard `surimi.json` (experiments and worker,
  controller, API, retention).
- `compose.yml` — profile `observability`: `prometheus` v3.16.0 (15 days, ADR
  0013), `grafana` 13.3.0, `jaeger` 2.23.0 (in memory), on 127.0.0.1:18090,
  18091 and 18092; metrics, OTLP and retention settings shared by `api` and
  `worker` (`RETENTION_LOGIN_IP_DAYS` and `_USER_AGENT_DAYS` moved there from
  `api`, since the worker now purges too); json-file log rotation, 5 × 10 MB per
  container (ADR 0013).
- `.env.example` — the new settings and ports.

`resources/bruno/surimi-modelgui/api/`:

- `admin/activity/` — `get stats`, `get stats users`, `get user activity`,
  `get audit events`; `get metrics.yml`. Run against the compose check
  (curl, same paths), not from Bruno itself.

**Deploy:** no migration. The worker starts deleting rows past their
retention at its first cycle as leader. Nothing is older than these periods
on 2026-11-17, but set any period to 0 to keep those rows. To see the
dashboards locally: `docker compose -f deployments/compose.yml --profile
observability up -d`, and `OTEL_EXPORTER_OTLP_ENDPOINT=http://jaeger:4318`
in `deployments/.env` for traces.

---

## 2026-11-17 — Statistics and audit endpoints

**Status:** built (phase 7, step 3). `tests/test_activity.py` (6 integration
tests): member 403 and anonymous 401 on every route; per-user counts with the
roll-up and the period; platform totals by scenario and week; one user's
activity; empty period 422; audit filters and the actor's name.

`apps/backend/src/surimi_backend/`:

- `observability/repository.py`, `schemas.py`, `router.py` —
  `GET /api/v1/admin/stats`, `/admin/stats/users`, `/admin/users/{id}/activity`.
- `audit/repository.py`, `schemas.py`, `router.py` — `GET /api/v1/admin/audit-events`.
- `users/repository.py` — `matches(q)`, the user search, shared by the users
  list and the statistics.
- `main.py` — both routers.

---

## 2026-11-17 — Traces

**Status:** built (phase 7, step 2). `tests/test_tracing.py` (5 tests, the
traced ones in a child process because OpenTelemetry's provider is global):
off without an endpoint; a request is traced and its `http.request` log line
carries `trace_id` and `span_id`; probes and scrapes are not traced; SQL
statements are spans under the calling span (PostgreSQL); controller calls
are spans (in-process gRPC server).

The SQLAlchemy instrumentation 0.66b2 declares SQLAlchemy < 2.1 and did
nothing on 2.1.6 at first (found in the compose check: no SQL spans). Its
version check is skipped, and the SQL span test guards it (ISSUES.md).

`apps/backend/`:

- `pyproject.toml`, `uv.lock` — `opentelemetry-sdk`, `-exporter-otlp-proto-http`
  1.45.2; instrumentations for FastAPI, SQLAlchemy, grpc, httpx 0.66b2.
- `src/surimi_backend/observability/tracing.py` — `configure_tracing` (once
  per process, only with `OTEL_EXPORTER_OTLP_ENDPOINT`), `instrument_app`,
  `add_trace_ids`.
- `src/surimi_backend/core/logging.py` — `add_trace_ids` in the processor chain.
- `src/surimi_backend/core/db.py` — `create_async_engine` called through its
  module, so the instrumentation's patch applies.
- `src/surimi_backend/main.py`, `scheduler/worker.py` — tracing before the
  engine and channel exist; spans per worker cycle and step; flush on stop.

---

## 2026-11-17 — Metrics

**Status:** built (phase 7, step 1). `tests/test_metrics.py` (9 unit
tests): route templates and `unmatched`, never raw paths; unknown methods share
one label; `METRICS_ENABLED=false` gives 404; `/metrics` not in OpenAPI;
sign-ins counted; `serve` turns on and empties the multiprocess folder.
`tests/test_metrics_integration.py` (2): a cancelled run is counted once,
although later polls emit more events for it; the leader's gauges.
`tests/test_grpc_client.py`: every call attempt is timed with its code.
`tests/conftest.py`: an autouse guard puts `PROMETHEUS_MULTIPROC_DIR` back
after each test, since `serve` writes it for its processes.

`apps/backend/`:

- `pyproject.toml`, `uv.lock` — `prometheus-client` 0.26.0.
- `src/surimi_backend/observability/metrics.py` — the metrics of the README
  table, the registry (multiprocess when `PROMETHEUS_MULTIPROC_DIR` is set),
  the `/metrics` route, the worker's metrics server.
- `src/surimi_backend/core/logging.py` — HTTP counter and histogram in
  `RequestContextMiddleware`; `/metrics` logged at debug like the probes.
- `src/surimi_backend/auth/history.py` — `surimi_logins_total` in `record_login`.
- `src/surimi_backend/experiments/events.py` — submitted and ended counters in
  `emit`, for status-change events only.
- `src/surimi_backend/integrations/controller/grpc_client.py` —
  `surimi_controller_rpc_duration_seconds` per attempt.
- `src/surimi_backend/scheduler/worker.py`, `experiments/repository.py` —
  leader gauge, cycle histogram, step failures, gauges from `active_counts`.
- `src/surimi_backend/cli.py` — `serve` sets up the multiprocess folder when
  `WEB_CONCURRENCY` > 1.
- `src/surimi_backend/core/config.py`, `startup.py` — `METRICS_ENABLED`,
  `WORKER_METRICS_PORT`, `PROMETHEUS_MULTIPROC_DIR`, `OTEL_EXPORTER_OTLP_ENDPOINT`.

Docs: ADR 0010 accepted (user, 2026-11-17) with the metric names of the
README; design written in [README.md](README.md) first.
