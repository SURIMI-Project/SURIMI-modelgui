# 0007 — A worker process polls the controller; jobs and schedules run on PostgreSQL with Procrastinate

**Status:** Proposed
**Date:** 2026-11-03
**Related:** [features/simulation-status-scheduler](../features/simulation-status-scheduler/README.md), [0003](0003-postgresql-sqlalchemy-alembic.md), [0008](0008-notifications-sse.md)

## Context

- The controller has no push or streaming RPC; status must be polled.
  `GetSimulationStatuses(experiment_ids)` returns only the experiments asked
  for. **Read from source.**
- Other background work: index outputs when an experiment finishes (seconds of
  CPU per run), detect stalled runs, clean up expired sessions.
- Long-running jobs tracked by messages in a broker get stuck when a message
  is lost or a worker dies mid-job: the state lives in two places, the queue
  and the database, and they drift apart. A worker that reads unfinished rows
  from the database has only one source of truth.
- Procrastinate is an asyncio task queue on PostgreSQL (psycopg 3) with
  retries, locks and periodic tasks; a periodic task is deferred only once per
  period across all workers, and cron accepts a sixth field for seconds.
  **Read from source** (Procrastinate docs), 2026-11-03.

## Decision

- A separate **worker** process from the same image (`surimi-worker`) runs
  Procrastinate.
- Periodic task `poll_controller`, every 10 s (`POLL_INTERVAL`): load
  experiments not in a final state, call `GetSimulationStatuses` with their ids
  in batches of 100, upsert simulations, derive the experiment state, write
  `experiment_events` and `NOTIFY` on change. A Procrastinate lock makes sure two
  polls never overlap.
- Periodic task `detect_stalls`, every minute; `purge_sessions`, daily.
- Job `index_outputs(experiment_id)`, deferred when an experiment reaches
  `finished`, with retries and backoff.
- The rows in `experiments` are the source of truth. A poll that fails changes
  nothing and the next one repeats it.

## Why

- Polling is forced by the controller. Polling only active experiments by id
  keeps each call small, however many finished runs exist.
- Running it in a worker, not in the API process, keeps output indexing and
  slow controller calls away from request latency, and lets the API scale
  without multiplying polls.
- PostgreSQL is already there (ADR 0003); a second broker (Redis, RabbitMQ)
  would be one more service to run on EDITO, monitor and back up, for a few jobs
  per hour.
- Reading state from rows instead of messages means a restart or a lost job
  cannot strand an experiment.

## Alternatives considered

| Option | Why not |
| --- | --- |
| Celery + beat + Redis | Not asyncio-native; needs Redis; beat is a separate singleton process |
| APScheduler inside the API | Runs once per API replica unless we add our own locking; heavy jobs share the API event loop |
| arq or Taskiq with Redis | Async and fine, but need Redis for no other reason |
| Kubernetes CronJob calling an endpoint | Minimum interval one minute; no job queue for output indexing |
| Ask for a streaming status RPC and skip polling | The right long-term fix (see the plan's improvements), but not available; the poller can be swapped for a stream consumer later |

## Consequences

- Status in the UI lags by up to `POLL_INTERVAL` plus SSE delivery.
- Procrastinate adds its own tables; its migrations run with ours.
- If job volume grows a lot, moving to Redis-based queues is a contained change
  behind the job functions.
- The experiment admission queue (which experiment goes to the controller
  next) is not a Procrastinate queue but state in `experiments`, see
  [0015](0015-experiment-admission-queue.md).
- To verify in phase 5: Procrastinate's seconds-level cron and the lock
  behaviour with two workers.
