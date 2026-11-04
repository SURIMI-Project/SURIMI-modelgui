# 0010 — Structured logs, Prometheus metrics and OpenTelemetry traces for operations; user activity in the database

**Status:** Proposed
**Date:** 2026-11-03
**Related:** [features/observability-and-activity](../features/observability-and-activity/README.md)

## Context

- Requirement: logging and observability, and statistics per user: how many
  times they signed in, when they last signed in, how many simulations were
  completed or cancelled.
- Past incidents with stuck runs were diagnosed by reading controller logs by
  hand; the visible errors pointed elsewhere. **Verified** 2026-10-30.
- Two different needs: operators want rates, latency and errors over time;
  admins want exact numbers per user.

## Decision

- **Logs:** `structlog`, JSON to stdout, one line per event, with `request_id`,
  `user_id`, `experiment_id` and `trace_id` bound in context. Uvicorn access
  logs routed through the same formatter. No passwords, tokens or full request
  bodies in logs.
- **Metrics:** `prometheus-client` with `/metrics` on the API and the worker.
  HTTP metrics by route template; business counters:
  `surimi_experiments_submitted_total{scenario}`,
  `surimi_experiments_completed_total{scenario,status}`,
  `surimi_logins_total{method,result}`,
  `surimi_controller_rpc_seconds{rpc,code}`,
  `surimi_poll_duration_seconds`, `surimi_active_experiments`,
  `surimi_stalled_experiments`. No user ids as labels.
- **Traces:** OpenTelemetry SDK with FastAPI, SQLAlchemy, grpc and httpx
  instrumentation, exported over OTLP when `OTEL_EXPORTER_OTLP_ENDPOINT` is
  set, off otherwise.
- **User activity:** in PostgreSQL. `login_events` (every attempt, method,
  result, IP, user agent), `users.last_login_at` and `login_count`,
  `experiment_events`, `audit_events`. Admin endpoints compute statistics with
  SQL: per user and overall, filterable by period.
- **Health:** `/healthz` (process alive), `/readyz` (database reachable;
  controller `GetProtocolVersion` within 2 s, reported but not failing
  readiness).
- Local compose profile `observability` with Prometheus and Grafana and a
  starter dashboard.

## Why

- Metrics are for aggregates over time; a per-user label would create one time
  series per user and Prometheus is not a ledger. Exact counts per user belong in
  the database, where they are joined with users and filtered by date.
- JSON logs with ids let anyone find every line about one experiment across API
  and worker, which is the search we did by hand on 2026-10-30.
- OpenTelemetry is vendor-neutral: the same code works with whatever collector
  EDITO or Konnecta provides, or none.
- Controller health is reported, not used to fail readiness, so a controller
  outage does not take our UI down too.

## Alternatives considered

| Option | Why not |
| --- | --- |
| Per-user Prometheus labels | Unbounded cardinality; numbers are approximate and expire with retention |
| Only logs, statistics from log queries | Needs a log store (Loki, ELK) to answer admin questions; slow and fragile |
| Sentry only | Good for errors and worth adding, but no metrics or user statistics |
| Python `logging` with a JSON formatter | Works; `structlog` makes context binding simpler and is common in FastAPI services |

## Consequences

- `login_events` grows with every attempt; keep 12 months (open question).
- Metric names are an interface for dashboards; renames need a changelog entry.
- Statistics endpoints need indexes on `(user_id, at)` and
  `(owner_id, status, finished_at)`.
