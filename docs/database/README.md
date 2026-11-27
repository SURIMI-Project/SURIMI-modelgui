# Database `surimi_modelgui_db`

| File | What it is |
| --- | --- |
| [deployments/mounts/postgres/bootstrap.sql](../../deployments/mounts/postgres/bootstrap.sql) | Creates the database and the application user, run once as the instance admin; safe to re-run |
| [indexes.sql](indexes.sql) | Exact definitions of the indexes DBML cannot express (partial, `DESC`, `INCLUDE`, GIN) |
| [schema.dbml](schema.dbml) | Full schema: tables, columns, types, defaults, indexes, enums, relations, notes. Open it in [dbdiagram.io](https://dbdiagram.io) (paste) or the VS Code "DBML" extension for a diagram |
| [ARCHITECTURE.md § Data model](../ARCHITECTURE.md#data-model) | Overview as a Mermaid ER diagram, rendered on GitHub |

PostgreSQL 17, no extensions. One application user, `surimi_modelgui`, owns
the schema, runs the migrations and is used by the API and the worker; the
instance admin, when we have it, is used only by `deployments/mounts/postgres/bootstrap.sql`. Decisions:
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
| Every table (phase 3: `users`, `identities`, `sessions`, `login_events`, `login_stats_monthly`, `audit_events`; phases 4 to 6 and the catalog, one migration per feature since 2026-11-16 (not released; they replace `0004_experiments_hcr_kg`, `0005_species`, `0006_hcr_owner_required` and the first `0007_hcr_configurations`): `0004_experiment_runs` (`app_settings`, `experiments`, `simulations`, `experiment_events`), `0005_experiment_outputs` (`experiment_outputs`), `0006_species_catalog` (`species`), `0007_hcr_configurations` (`hcr_configurations`, rules in `jsonb`); then `0008_initial_hcr_snapshots` (`initial_hcr_snapshots`, `experiments.initial_hcr_snapshot_id`, 2026-11-23, upgrade, downgrade and upgrade again **Verified** on PostgreSQL 17 with an identical `pg_dump --schema-only`); `0009_scenario_catalog` (`catalog_scenarios`, `catalog_groups`, `catalog_group_species`, `catalog_hcr_eligible`, 2026-11-27, upgrade, downgrade, upgrade again and `seed-catalog` **Verified** on PostgreSQL in the test container, index and constraint names checked in `pg_indexes` and `pg_constraint`)) | The SQLAlchemy models and Alembic migrations in `apps/backend/src/surimi_backend/migrations/` | Edited by hand to match the migrated database, and checked against it (columns, indexes, foreign keys, enums from `information_schema` and `pg_indexes`). **Verified** 2026-11-03 for migration `0002_auth`; for the four migrations 0004 to 0007, `pg_dump --schema-only` **Verified** 2026-11-16 identical to that of the chain they replace |
| Once every table is built | The migrations | Regenerated with `db2dbml` (below), never edited by hand |

**Proposed** (2026-11-03): regeneration waits until every designed table
exists, because `db2dbml` would drop the designed-but-unbuilt tables from
the file. `scripts/db-docs.sh` is not written yet.

Regenerating (once every table is built; script `scripts/db-docs.sh` to be written):

```bash
docker compose -f deployments/compose.local.yml run --rm migrate
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
| Simulations per state for a page of experiments (`simulation_counts`: `GROUP BY experiment_id, status WHERE experiment_id IN (…)`) | unique `simulations (experiment_id, sim_order)`, leading column; at most 5 rows per experiment |
| Events polled after a cursor (`GET /api/v1/events?after=`), and the cursor start (`max(id)`) | `experiment_events (owner_id, id)` for members, primary key for admins |
| Audit by actor, by target, or by action | `audit_events_actor_at_idx`, `audit_events_target_at_idx`, `audit_events_action_at_idx` |
| Recent failed sign-ins (security view) | `login_events_failed_at_idx (at DESC) WHERE result <> 'success'` |
| Platform sign-in totals by month | `login_stats_monthly_month_idx (month)` |
| Stalled runs (admin view) | `experiments_stalled_idx (last_progress_at) WHERE stalled` |
| Outputs still to index (worker), oldest attempt first | `experiment_outputs_todo_idx (next_attempt_at) WHERE state IN ('pending', 'waiting_for_file', 'indexing')` |
| Species names of the codes in a catalog or a `?code=` list; one code | primary key `species_pkey (species_code)` |
| Species word search (`GET /api/v1/species?q=`) | `species_search_idx` (GIN) on `to_tsvector('simple', species_code || ' ' || coalesce(name, '') || ' ' || coalesce(scientific_name, ''))` |
| Species by ISSCAAP group, family, order or higher taxa | `species_isscaap_group_idx`, `species_family_idx`, `species_order_or_higher_taxa_idx` |
| Species page sorted by English or scientific name, either direction | `species_name_idx (name, species_code)`, `species_scientific_name_idx (scientific_name, species_code)` |
| A scenario's catalog: its row, groups, members, HCR-eligible entries (`load_scenario`, on every catalog build) | primary keys `catalog_scenarios_pkey`, `catalog_groups_pkey`, `catalog_group_species_pkey`, `catalog_hcr_eligible_pkey`, leading column `scenario_name` |
| Codes in use by the catalog (species import, `replace` mode: `SELECT DISTINCT species_code`) | `catalog_group_species_species_code_idx`, primary key of `catalog_hcr_eligible` |
| Deleting a scenario's groups (import), cascading to their members | `catalog_group_species_group_idx (scenario_name, group_code)` |
| Deleting or renaming a `species` row (foreign key check) | `catalog_group_species_species_code_idx (species_code)` |
| The copies of an experiment (`cloned_from_id`), and the foreign key's `ON DELETE SET NULL` | `experiments_cloned_from_idx (cloned_from_id) WHERE cloned_from_id IS NOT NULL` |
| One HCR configuration name per owner and scenario; a user's configurations for a scenario (`GET /scenarios/{name}/hcr-configurations`, the experiment options) | unique `hcr_configurations_name_uq (owner_id, scenario_name, lower(name))` |
| Find or insert the snapshot of a `GetInitialHCRData` answer (`INSERT … ON CONFLICT (scenario_name, content_hash) DO NOTHING`, then `SELECT … WHERE scenario_name = ? AND content_hash = ?`); a scenario's snapshots, newest first (`GET /scenarios/{name}/initial-hcr-data/history`, a few rows a year) | unique `initial_hcr_snapshots_scenario_hash_uq (scenario_name, content_hash)` |
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

- `deployments/mounts/postgres/bootstrap.sql` run twice as the admin: second run changes nothing.
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
  | Event replay for a member (now: polling after a cursor, same query) | 0.09 ms | Index Only Scan `experiment_events (owner_id, id)` |
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
