# 0003 — PostgreSQL 17 with SQLAlchemy 2 async and Alembic migrations

**Status:** Proposed
**Date:** 2026-11-03
**Related:** [0002](0002-backend-python-fastapi.md), [0007](0007-scheduler-worker-postgres-queue.md)

## Context

- Data to persist: users, identities, sessions, experiments with their submitted
  parameters, simulations, events, login history, audit log, output metadata
  series, background jobs.
- The data is relational (user → experiments → simulations) and needs
  filtering and aggregation (per user, per status, per period).
- Submitted parameters are nested (`regulations_definitions_summary`) and follow
  the controller's protocol, which can change.

## Decision

PostgreSQL 17. SQLAlchemy 2.0 with the async engine and the asyncpg driver,
typed `Mapped[...]` models. Alembic for schema migrations, run by a one-shot
`migrate` container before the API starts. The submitted request is stored as
`jsonb` next to the indexed columns we filter on (`owner_id`, `status`,
`scenario_name`, `submitted_at`). Case-insensitive uniqueness of email and
username through `lower()` indexes, so no extension is needed ([0014](0014-postgresql-in-repo-bundled-or-external.md)).

## Why

- Relational data with joins and aggregates is what PostgreSQL is for; `jsonb`
  covers the parts whose shape belongs to the controller.
- The same database also serves as job queue and pub/sub (ADR 0007), so there
  is one stateful service to run and back up.
- PostgreSQL is the most widely run open-source relational database: managed
  offers, an official container image and operators exist for every platform
  we may deploy on (ADR 0014).
- SQLAlchemy 2 is the most complete async ORM for Python; Alembic
  autogenerates migrations from the models and keeps an ordered history.

## Alternatives considered

| Option | Why not |
| --- | --- |
| MongoDB | No joins or transactions across users, experiments and sessions without extra work; the team does not run it |
| SQLite | No concurrent writers (API and worker), no `LISTEN/NOTIFY` |
| SQLModel | Thin layer over SQLAlchemy that lags behind its async features; adds a second way to declare models |
| Tortoise ORM | Smaller ecosystem, weaker migrations |
| Raw SQL with asyncpg | Fastest, but hand-written mapping and migrations for every table |

## Consequences

- Every schema change is an Alembic revision reviewed with the code.
- Backups of one database cover users, history and jobs.
- Tests run against a real PostgreSQL (testcontainers), not SQLite.
