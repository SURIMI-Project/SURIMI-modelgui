# Database `surimi_modelgui_db`

| File | What it is |
| --- | --- |
| [deployments/postgres/bootstrap.sql](../../deployments/postgres/bootstrap.sql) | Creates the database and the application user, run once as the instance admin; safe to re-run |
| [indexes.sql](indexes.sql) | Exact definitions of the indexes DBML cannot express (partial, `DESC`, `INCLUDE`, GIN) |
| [schema.dbml](schema.dbml) | Full schema: tables, columns, types, defaults, indexes, enums, relations, notes. Open it in [dbdiagram.io](https://dbdiagram.io) (paste) or the VS Code "DBML" extension for a diagram |
| [ARCHITECTURE.md § Data model](../ARCHITECTURE.md#data-model) | Overview as a Mermaid ER diagram, rendered on GitHub |

PostgreSQL 17, no extensions. One application user, `surimi_modelgui`, owns
the schema, runs the migrations and is used by the API and the worker; the
instance admin, when we have it, is used only by `deployments/postgres/bootstrap.sql`. Decisions:
[0003](../decisions/0003-postgresql-sqlalchemy-alembic.md) (engine, ORM,
migrations), [0014](../decisions/0014-postgresql-in-repo-bundled-or-external.md)
(names, compose, Helm bundled or external),
[0013](../decisions/0013-data-retention.md) (how long each table keeps rows).

## Why DBML and Mermaid both

- **DBML** carries what an ER diagram cannot: types, defaults, indexes,
  expression indexes, enums, notes. It converts to SQL and back with
  `@dbml/cli`, and dbdiagram.io draws it.
- **Mermaid** renders inside GitHub and the other docs, so the overview sits
  next to the text that explains it. It shows tables, keys and relations only.

GitHub does not render DBML, which is why the Mermaid overview stays.

## Source of truth

| Phase | Source of truth | DBML |
| --- | --- | --- |
| Tables not built yet (experiments and later) | This DBML, **Proposed** 2026-11-03 | Written by hand |
| Built tables (phase 3: `users`, `identities`, `sessions`, `login_events`, `login_stats_monthly`, `audit_events`) | The SQLAlchemy models and Alembic migrations in `apps/backend/src/surimi_backend/migrations/` | Edited by hand to match the migrated database, and checked against it (columns, indexes, foreign keys, enums from `information_schema` and `pg_indexes`). **Verified** 2026-11-03 for migration `0002_auth` |
| Once every table is built | The migrations | Regenerated with `db2dbml` (below), never edited by hand |

**Proposed** (2026-11-03): regeneration waits until every designed table
exists, because `db2dbml` would drop the designed-but-unbuilt tables from
the file. `scripts/db-docs.sh` is not written yet.

Regenerating (once every table is built; script `scripts/db-docs.sh` to be written):

```bash
docker compose -f deployments/compose.yml run --rm migrate
npx -p @dbml/cli db2dbml postgres \
  "postgresql://surimi_modelgui:<password>@localhost:5432/surimi_modelgui_db" \
  -o docs/database/schema.dbml
```

`db2dbml` reads the live schema, so the file cannot drift from the
migrations. Column notes are kept as PostgreSQL `COMMENT`s in the migrations,
which `db2dbml` copies into the DBML.

## Indexing

Rules we follow:

- **One index per real query**, written down below. No index "just in case":
  each one costs write time and disk.
- **Partial indexes** where a query only ever looks at a small slice
  (in-flight runs, the queue, rows that still hold an IP, soft-deleted rows),
  so the index stays tiny however large the table grows.
- **Column order = equality columns first, then the sort column**, with the
  sort direction of the query (`created_at DESC`), so lists come back in index
  order and `LIMIT 20` stops after 20 rows.
- **`INCLUDE`** extra columns when that lets PostgreSQL answer from the index
  alone (index-only scan).
- **Every foreign key column has an index**, because PostgreSQL does not add
  one and cascading deletes would otherwise scan the child table.
- **No index on small tables** beyond uniqueness (`users`, `app_settings`:
  hundreds of rows at most), and none on a low-cardinality column alone
  (`scenario_name` has 3 values; scenario filters ride on the `created_at`
  index).
- **Every table is covered:** each table's read paths are in the table below;
  a table not listed for a query is only read by primary key.
- **Full-text search without extensions:** a GIN index on
  `to_tsvector('simple', name)`. `pg_trgm` would also match inside words but
  needs an extension (ADR 0014).

| Query | Index |
| --- | --- |
| Sign in by email or username | `users_email_lower_uq`, `users_username_lower_uq` |
| SSO sign-in by provider and subject | unique `identities (provider, subject)` |
| Refresh a session; revoke all of a user | unique `sessions (refresh_token_hash)`; `sessions (user_id)` |
| Refresh with a token that was already replaced (reuse detection) | `sessions_previous_refresh_token_hash_idx WHERE previous_refresh_token_hash IS NOT NULL`; only looked up when the current-token lookup misses |
| Member's experiment list, newest first | `experiments_owner_created_idx (owner_id, created_at DESC) WHERE deleted_at IS NULL` |
| Admin list, newest first; filtered by status | `experiments_created_idx`, `experiments_status_created_idx` |
| Search by name | `experiments_name_fts_idx` (GIN) |
| Poller; pods in use per owner | `experiments_in_flight_idx (status) INCLUDE (owner_id, pods_required) WHERE status IN (in flight)` |
| Next queued experiments | `experiments_queue_idx (priority DESC, queued_at) WHERE status = 'queued'` |
| Activity stats per user and period | `experiments_owner_finished_idx (owner_id, finished_at) INCLUDE (status)`; `login_events_user_at_idx (user_id, at DESC)` |
| Experiment detail with simulations and history | unique `simulations (experiment_id, sim_order)`; `experiment_events (experiment_id, id)` |
| SSE replay after reconnect | `experiment_events (owner_id, id)` for members, primary key for admins |
| Audit by actor, by target, or by action | `audit_events_actor_at_idx`, `audit_events_target_at_idx`, `audit_events_action_at_idx` |
| Recent failed sign-ins (security view) | `login_events_failed_at_idx (at DESC) WHERE result <> 'success'` |
| Platform sign-in totals by month | `login_stats_monthly_month_idx (month)` |
| Stalled runs (admin view) | `experiments_stalled_idx (last_progress_at) WHERE stalled` |
| Outputs still to index (worker) | `experiment_outputs_todo_idx (updated_at) WHERE state <> 'ready'` |
| Nightly purges | `login_events_at_idx`, `login_events_ip_at_idx WHERE ip IS NOT NULL`, `login_events_ua_at_idx WHERE user_agent IS NOT NULL`, `audit_events (at)`, `sessions (expires_at)`, `experiments_deleted_idx WHERE deleted_at IS NOT NULL` |

No output values are stored in the database: charts and maps are read from
the `.nc` files on request ([ADR 0009](../decisions/0009-output-storage-and-ingestion.md)),
so there is no output table to index.

Keeping it fast later: from phase 2, an integration test runs `EXPLAIN` on
these queries against seeded data and fails if one stops using its index;
`pg_stat_statements` (shipped with PostgreSQL, enabled where we run the
server) shows the slowest real queries.

## What has been verified

2026-11-03: `dbml2sql --postgres` converts `schema.dbml` without errors, and
the resulting SQL creates all 11 tables and 8 enum types,
and `indexes.sql` applies on top of it, on `postgres:17-alpine`
in a database named `surimi_modelgui_db`. **Verified.** Partial indexes and
other PostgreSQL-only forms are notes in the DBML; their exact definitions are
in `indexes.sql`.

Also on 2026-11-03, on `postgres:17-alpine` (**Verified**):

- `deployments/postgres/bootstrap.sql` run twice as the admin: second run changes nothing.
- Same day, on the compose stack: changing `DB_PASSWORD` and restarting
  updates the user's password and the API reconnects; custom `DB_USER` and
  `DB_NAME` create that user (not superuser, cannot create databases) and
  database; without `app_password` the script stops with exit code 3.
- As `surimi_modelgui`: the schema is created (migrations), rows are written,
  `LISTEN/NOTIFY` works; the user is neither superuser nor allowed to create
  databases.
- The queue query in
  [features/experiment-queue](../features/experiment-queue/README.md#how-to-check-the-queue)
  returns waiting runs in fair order on sample data.
- Running the queries found and fixed one schema bug: the one-to-one relation
  `experiment_outputs` → `experiments` had its foreign key on the wrong table.
- Index use, with `schema.sql` + `indexes.sql` and synthetic data (200,000
  experiments, 1,000,000 `login_events`, 1,000,000 `experiment_events`,
  200,000 `audit_events`, plus outputs, monthly roll-ups and failed
  sign-ins), `EXPLAIN ANALYZE`, all 22 read paths:

  | Query | Time | Plan |
  | --- | --- | --- |
  | Sign in by email | 0.06 ms | Index Scan `users_email_lower_uq` |
  | Member list, newest 20 | 0.14 ms | Index Scan `experiments_owner_created_idx` |
  | Admin list, newest 20 | 0.05 ms | Index Scan `experiments_created_idx` |
  | Admin list, status `failed` | 0.06 ms | Index Scan `experiments_created_idx` (planner's choice for a common status) |
  | Name search | 0.18 ms | Bitmap Index Scan `experiments_name_fts_idx` |
  | Poller, in-flight | 0.16 ms | Index Scan `experiments_in_flight_idx` |
  | Pods in use per owner | 0.08 ms | Index Only Scan `experiments_in_flight_idx` |
  | Next queued | 0.05 ms | Index Scan `experiments_queue_idx` |
  | User stats, last year | 0.15 ms | Index Only Scan `experiments_owner_finished_idx` |
  | User sign-ins, 30 days | 0.10 ms | Index Only Scan `login_events_user_at_idx` |
  | SSE replay for a member | 0.09 ms | Index Only Scan `experiment_events (owner_id, id)` |
  | Experiment history | 0.04 ms | Index Only Scan `experiment_events (experiment_id, id)` |
  | Audit of a target | 0.04 ms | Index Scan `audit_events_target_at_idx` |
  | Purge IPs older than 90 days | 0.03 ms | Index Scan `login_events_ip_at_idx` |
  | Purge user agents older than 90 days | 0.04 ms | Index Scan `login_events_ua_at_idx` |
  | Purge sign-ins older than 13 months | 0.84 ms | Index Scan `login_events_at_idx` |
  | Recent failed sign-ins | 0.04 ms | Index Scan `login_events_failed_at_idx` |
  | Platform totals by month | 0.63 ms | Index Scan `login_stats_monthly_month_idx` |
  | Stalled runs | 0.05 ms | Bitmap Index Scan `experiments_stalled_idx` |
  | Outputs to index | 0.03 ms | Index Scan `experiment_outputs_todo_idx` |
  | Audit by action | 0.04 ms | Index Scan `audit_events_action_at_idx` |
  | Admin list, one scenario | 0.03 ms | Index Scan `experiments_created_idx` (scenario filtered on the way) |

  The remaining sequential scans in those plans are look-ups of one user in
  the 500-row `users` table inside the test queries.
