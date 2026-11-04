# 0014 — PostgreSQL ships with the repo; Helm chooses bundled or external; database `surimi_modelgui_db`, one application user

**Status:** Proposed
**Date:** 2026-11-03
**Related:** [0003](0003-postgresql-sqlalchemy-alembic.md), [database/](../database/README.md), [features/monorepo-restructure](../features/monorepo-restructure/README.md)

## Context

- User, 2026-11-03: the repo must contain PostgreSQL; the future Helm chart
  must be able to use its own database or connect to an external one; the
  database is named like `surimi_modelgui_db`; the database user must be
  configurable, and may be the admin of the PostgreSQL instance; **the same
  user runs the migrations and the application**.
- On EDITO (Onyxia) we cannot count on installing operators, and whether a
  managed PostgreSQL is offered is an open question.
- Bitnami moved its versioned images to `bitnamilegacy` on 2025-08-28, without
  further updates, and kept only a small free set of latest images for
  development. Charts pointing at the main catalog stop working out of the box.
  **Read from source** (Bitnami GitHub issues and coverage), 2026-11-03.

## Decision

### Names and users

Every name is a setting; these are the defaults.

| Item | Default | Used by |
| --- | --- | --- |
| Database | `surimi_modelgui_db` | — |
| Application user | `surimi_modelgui` | `migrate` job, API and worker. Owns the schema, so it runs migrations (DDL) and reads and writes data |
| Admin user (optional) | the instance admin, `POSTGRES_USER` (default `postgres`) | `db-bootstrap` job only: creates the database and the application user when missing, sets the user's password. In the bundled instance its own name and password are applied only when the volume is first created (official image) |
| Schema | `public` | Procrastinate's tables are prefixed `procrastinate_` |
| Extensions | none | Case-insensitive uniqueness through `lower()` indexes |

Two ways to run it, with the same settings:

1. **We have the instance admin** (bundled PostgreSQL, or an external server
   where we are admin): `db-bootstrap` runs on every start with the admin
   credentials. It creates the database and the application user if they are
   missing and **sets the user's password every time**, so a changed
   `DB_PASSWORD` takes effect on the next start; names come from `DB_NAME`
   and `DB_USER`. Then everything else uses the application user. Setting `DB_USER` to
   the admin itself also works (no bootstrap needed); the backend logs a
   warning at start-up.
2. **A DBA creates the database and user for us**: no admin credentials;
   `db-bootstrap` is skipped.

### Configuration of the backend

| Setting | Default | Meaning |
| --- | --- | --- |
| `DB_HOST`, `DB_PORT` | `postgres`, 5432 | Server |
| `DB_NAME` | `surimi_modelgui_db` | Database |
| `DB_USER`, `DB_PASSWORD` | `surimi_modelgui` | Application user: migrations, API, worker |
| `DB_ADMIN_USER`, `DB_ADMIN_PASSWORD` | unset | Only for `db-bootstrap`; unset skips it |
| `DB_SSLMODE` | `disable` locally, `require` external | TLS |
| `DB_POOL_SIZE` | 10 | Connections per process |
| `DATABASE_URL` | unset | Overrides the pieces above when set |

The URL is built in `core/config.py`. The bootstrap script is
[deployments/postgres/bootstrap.sql](../../deployments/postgres/bootstrap.sql).

### In the repo (compose, from phase 2)

`deployments/compose.yml`:

- `postgres`: `postgres:17-alpine`, admin `POSTGRES_USER=postgres` with
  `POSTGRES_PASSWORD` from `.env`, named volume `postgres-data`, `pg_isready`
  healthcheck, no published port.
- `db-bootstrap`: runs `deployments/postgres/bootstrap.sql` with the admin credentials.
- `migrate`: backend image, `alembic upgrade head` as `surimi_modelgui`.
- `api` and `worker` connect as `surimi_modelgui` and wait for the other two
  with `depends_on: condition: service_completed_successfully`.
- `compose.local.yml` publishes `127.0.0.1:5432` for local tools.

### Helm (phase 9)

```yaml
database:                       # same in both modes
  name: surimi_modelgui_db
  user: surimi_modelgui         # migrations, API and worker
  existingSecret: ""            # key: password; empty: chart generates it

postgresql:
  enabled: true                 # true: the chart runs PostgreSQL; false: use externalDatabase
  image: postgres:17
  adminUser: postgres           # used by db-bootstrap only
  persistence: { size: 10Gi, storageClass: "" }
  backup:
    enabled: true               # CronJob pg_dump → S3
    schedule: "0 2 * * *"
    s3Uri: s3://<bucket>/backups/surimi_modelgui_db/

externalDatabase:
  host: ""
  port: 5432
  sslMode: require
  admin:                        # optional: set when we may create the database and user
    user: ""                    # e.g. the instance admin
    existingSecret: ""          # key: admin-password; empty: db-bootstrap is skipped
```

The chart's own PostgreSQL is a small StatefulSet with the official image, a
PVC and a Secret, written in our chart, not a Bitnami sub-chart. The backend
gets the same `DB_*` variables in both modes.

## Why

- A database in compose makes the stack start with one command, and tests and
  local runs use the same engine and version as production.
- One switch (`postgresql.enabled`) covers both requested modes; the backend
  sees the same variables either way, so no code path differs.
- **One application user**, as decided by the user: one credential to manage
  and rotate, no grants or default privileges to keep in step when migrations
  add tables. The trade-off accepted: a flaw in the API could alter or drop
  our tables, which a separate data-only user would have prevented. It cannot
  touch other databases on a shared server, because the user is not an admin.
- **Admin kept out of the running app:** the instance admin, when we have it,
  is used only by the short bootstrap job. Running the app as admin is
  possible but would expose every database on the server to a bug in our code.
- Separate `DB_*` variables let Helm put the password in a Secret and the host
  in values.
- Official `postgres` image: maintained by the PostgreSQL Docker team, no
  dependency on Bitnami's reduced free catalog.
- No extensions: an external database managed by someone else may not let us
  run `CREATE EXTENSION`.
- A `migrate` job separate from the API: migrations run once per deploy, not
  once per replica, and a failed migration stops the rollout.

## Alternatives considered

| Option | Why not |
| --- | --- |
| Separate owner (migrations) and data-only app user | Least privilege, but the user chose one user for simplicity, 2026-11-03 |
| The app always connects as the instance admin | Allowed by configuration, not the default: any bug becomes control of the whole server |
| Bitnami PostgreSQL sub-chart | Versioned images moved to an unmaintained legacy repo in 2025 |
| CloudNativePG operator | Best for production HA and backups, but needs an operator in the cluster; possible later as a third mode |
| Migrations at API start-up | Every replica races to migrate; a long migration delays readiness |
| `citext` for emails | Needs an extension; `lower()` indexes do the same |
| Name `surimi` or `modelgui` | Ambiguous on a shared server hosting other SURIMI databases |

## Consequences

- Bundled mode means we own backups and upgrades of that PostgreSQL; the
  backup CronJob and a tested restore are part of phase 9.
- Major PostgreSQL upgrades in bundled mode need a dump and restore.
- `.env.example` gains the `DB_*` and `POSTGRES_*` variables.
