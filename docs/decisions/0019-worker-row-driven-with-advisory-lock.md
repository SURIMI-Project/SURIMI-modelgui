# 0019 — The worker is a row-driven loop with one leader chosen by a PostgreSQL advisory lock; no job queue library

**Status:** Proposed
**Date:** 2026-11-06
**Supersedes:** [0007](0007-scheduler-worker-postgres-queue.md) in its choice of Procrastinate. A separate worker process that polls the controller stays. Also replaces the "Procrastinate lock" in [0015](0015-experiment-admission-queue.md)
**Related:** [features/simulation-status-scheduler](../features/simulation-status-scheduler/README.md), [features/experiment-queue](../features/experiment-queue/README.md), [features/experiment-outputs](../features/experiment-outputs/README.md), [0008](0008-notifications-sse.md)

## Context

- The worker has four jobs: poll the controller for the experiments in flight,
  dispatch `queued` experiments when Ecopath pods are free, flag stalled or
  never-started runs, and index the outputs of finished runs. Each job reads
  its work from rows: `experiments.status`, `experiment_outputs.state`.
  Nothing is handed from one job to another except through those rows.
- ADR 0007 chose Procrastinate (a PostgreSQL task queue) for periodic tasks,
  locks and the indexing job. Procrastinate talks to PostgreSQL through
  psycopg 3, while the backend uses asyncpg (ADR 0003). It ships its own
  schema (tables, functions, triggers), which is created by its own command,
  outside Alembic. Its seconds-level cron and its locking with two workers were
  still to be verified (ADR 0007, Consequences).
- ADR 0007 already says the rows, not messages, are the source of truth, so
  that a lost job cannot strand an experiment.
- Two worker replicas must never poll or dispatch at the same time: two
  dispatchers could both see 5 free pods and submit 10.

## Decision

- `surimi-backend worker` runs one asyncio loop in a separate process from the
  same image.
- **Leadership:** the worker opens one dedicated connection and calls
  `pg_try_advisory_lock(<fixed key>)`. The worker that gets the lock runs the
  jobs; the others try again every 10 s. The lock belongs to the connection,
  so if the leader dies, PostgreSQL frees the lock when the connection drops
  and another worker takes over. The leader checks its connection at every
  cycle and stops leading if it is gone.
- **Cycle**, every `POLL_INTERVAL_SECONDS` (10 s), or at once when the API
  sends `NOTIFY surimi_dispatch` (a new, cancelled or reprioritised
  experiment):
  1. poll the controller for the experiments in flight, update simulations,
     derive the experiment state, flag stalls and never-started runs, retry
     cancels, write `experiment_events` and `NOTIFY experiment_events`;
  2. dispatch queued experiments that fit in the free pods;
  3. index the outputs whose state is not final (in a thread, one at a time).
- Each step runs in its own transaction and is idempotent. A failed step is
  logged and repeated at the next cycle.

## Why

- Every job is already "find rows in state X and move them on", so a queue
  adds a second copy of the state, which is what ADR 0007 wanted to avoid.
- One driver (asyncpg) and one migration tool (Alembic). No schema that
  Alembic does not know.
- An advisory lock is a standard PostgreSQL feature with no extension and no
  table. It is released by the server when the holder disconnects, so a dead
  leader cannot block the others.
- Fewer moving parts to run on EDITO.

## Alternatives considered

| Option | Why not |
| --- | --- |
| Procrastinate (ADR 0007) | Second driver (psycopg 3), schema outside Alembic, unverified seconds cron and lock behaviour; its queue would duplicate the row state |
| Celery, arq, Taskiq | Need Redis or RabbitMQ for a few jobs per minute |
| Run the loop inside the API | Runs once per API replica; indexing would share the API's event loop |
| A lock row with a lease (`UPDATE … WHERE lease_until < now()`) | Works, but needs a table and lease renewal; the advisory lock is released by the server on disconnect |

## Consequences

- Only one worker is active at a time. That is enough: a cycle makes a few
  controller calls and indexing one run takes seconds. More throughput would
  need per-row claiming (`FOR UPDATE SKIP LOCKED`), which the dispatcher
  already uses.
- A delayed job with retries (indexing) is a row with `attempts` and
  `next_attempt_at`, not a queued job.
- The worker needs a connection outside the pool for the lock and one for
  `LISTEN`.
- If the leader hangs without dropping its connection, nobody takes over; the
  worker's health is visible in its logs and in the `scheduler.cycle` events.
