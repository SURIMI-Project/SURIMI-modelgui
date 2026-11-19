# Backend skeleton — changelog

Every change made for this feature, newest first. Each entry says what changed,
where, how it was checked and what deploying it needs. Design is in
[README.md](README.md).

---

## 2026-11-19 — `proto-stubs`: `buf` from the repo root, runs only on proto changes

**Status:** built, not pushed. **Verified** 2026-11-19 on Windows:
`generate.py` finds `buf` 1.75.0 in the root `node_modules`, exports
`buf.build/surimi/surimi-protocol:be08fd333a8649e586c9a4ebf546ad96`, and the
regenerated stubs equal the committed ones (`git diff --exit-code -- packages/proto`
clean). **Verified** in a clean copy: `npm ci --workspaces=false` installs only
`@bufbuild/buf`, and `buf --version` runs. **Not verified:** the job on GitHub
(it runs on the next push, since `ci.yml` is in its filter).

Why: CI run `44540519356` (push of `3de062a`, PR #3, 2026-11-19) failed in
`proto-stubs` with "buf CLI not found". The job got `buf` from `npm ci`, and
PR #3 removed `@bufbuild/buf` from `apps/frontend/package.json` along with the
frontend's stubs. The failure skipped `deploy-develop`.

- `package.json`: `devDependencies` `@bufbuild/buf` `^1.73.0` (locked at 1.75.0 in
  `package-lock.json`, which also gained npm 11's `"peer": true` flags); the
  `proto:pull` and `proto:gen` scripts removed (they forwarded to frontend
  scripts PR #3 deleted). The frontend image does not install it
  (`npm ci --workspace apps/frontend --include-workspace-root=false`).
- `.github/workflows/ci.yml`: `changes` gets a `proto` output (`packages/proto/**`,
  `uv.lock`, `package.json`, `package-lock.json`, `ci.yml`); `proto-stubs` runs on
  it instead of `backend`, and installs with `npm ci --workspaces=false`.
- Rejected: `bufbuild/buf-action` in the job (fixes CI only; running `generate.py`
  on a developer machine would need `buf` installed by hand); dropping the job
  (it is the only check that the committed stubs match the pin, ADR 0011).

---

## 2026-11-16 — `WEB_CONCURRENCY`: several API processes

**Status:** built. Ruff, format, mypy strict clean; **292 tests pass, all
integration tests included** (PostgreSQL 17 in Docker), 2026-11-16.
**Verified** with a throwaway API container (`WEB_CONCURRENCY=2`): a
supervisor and two uvicorn processes, JSON logs in both, `/healthz` 200.

Asked by the user, 2026-11-16: make the serve command configurable, with more
processes. Design and trade-offs: [README § Processes](README.md#processes).

- `core/config.py`: `web_concurrency` (`WEB_CONCURRENCY`, default 1, 1 to 32).
- `cli.py` (`serve`): `workers=settings.web_concurrency`.
- `startup.py`: listed in the `http` section of the startup log.
- `deployments/compose.yml`: the `api` service passes `WEB_CONCURRENCY`
  (default 1); `deployments/.env.example` documents it with the database
  connection arithmetic.
- Tests: `tests/test_cli.py` (`serve` passes the import string, `factory`,
  `workers` 1 and 4, `log_config=None`; 0 and 33 refused).

---

## 2026-11-16 — Docs checked against the code and the database

Asked by the user, 2026-11-16: check that the docs are up to date. Checked
mechanically, not by reading (scripts outside the repo):

- **API routes vs Bruno:** every route has a request and every request a
  route. **Verified** (OpenAPI of `create_app()`).
- **API paths named in the docs:** each is a route, or in a feature marked
  planned (observability, the catalog workbook, outputs compare).
- **Settings:** every field of `core/config.py` is now documented in a feature
  README. Added: the scheduler's (`POLL_INTERVAL_SECONDS`,
  `START_TIMEOUT_MINUTES`, `INIT_TIMEOUT_MINUTES`, `STALL_AFTER_MINUTES`,
  `LOST_AFTER_POLLS`, `CANCEL_TIMEOUT_MINUTES`, new Configuration section of
  simulation-status-scheduler), `FAKE_CONTROLLER_*` (here), `S3_REGION`
  (experiment-outputs). Names that did not exist were corrected:
  `POLL_INTERVAL`, `INIT_TIMEOUT`, `STALL_AFTER`, `MAX_HEAD_WAIT`,
  `DISPATCH_INTERVAL` (experiment-queue, scheduler, ARCHITECTURE; the ADRs
  0007 and 0015 keep their wording with a "built as" note).
- **Files named in the docs:** the scheduler listed `mapping.py`,
  `stalls.py`, `tasks.py` (the code is `poller.py`, `derive.py`,
  `dispatcher.py`, `worker.py`); experiment-outputs listed `outputs/report.py`
  (the report is `queries.report`, run by `indexer.py`). The others not found
  are external, generated or planned.
- **Database vs `schema.dbml`, `indexes.sql`, the database README:** tables
  and columns match (added `experiment_outputs.created_at`); the enum
  `period_kind`, which no table uses, removed; `hcr_configurations` given its
  `indexes` block; `experiments_cloned_from_idx` explained in the README.
  **Verified** against the compose database at `0007_hcr_configurations`.
- **ARCHITECTURE data model:** `app_settings`, `hcr_configurations` and
  `species` added to the diagram.
- **Indexes of the docs:** every feature folder and ADR is listed; the
  features index rows for the console, experiments and outputs brought up to
  date; ADR 0015's status in the index notes the job queue replaced by 0019.
- **ADR 0014** describes `db-bootstrap` with `POSTGRES_USER`/`POSTGRES_PASSWORD`
  and PostgreSQL published on `127.0.0.1:15432`, as built (it named
  `DB_ADMIN_*` and a `compose.local.yml` that do not exist). **ADR 0022** no
  longer says the seed converts tonnes.
- **`CLAUDE.md`** layout table: rows for `core/` and `catalog/`. **`README.md`**:
  the console's tabs.

---

## 2026-11-16 — Unreleased migrations rebuilt, one per feature

**Status:** done. Ruff, format, mypy strict clean; **286 tests pass, all integration tests included** (PostgreSQL 17 in Docker), 2026-11-16.

Asked by the user, 2026-11-16: the migrations since 0003 are not committed, so
squash them or make them clearer (the HCR one, for example, was created in
0004, changed in 0006 and replaced in 0007).

`apps/backend/src/surimi_backend/migrations/versions/`:

| Removed | Added |
| --- | --- |
| `20261113_0004_experiments_hcr_kg.py` (experiments, simulations, events, settings, outputs, `harvest_control_rules`) | `20261116_0004_experiment_runs.py`: `app_settings`, `experiments`, `simulations`, `experiment_events`, enums `experiment_status`, `simulation_status` |
| | `20261116_0005_experiment_outputs.py`: `experiment_outputs`, enum `output_state` |
| `20261116_0005_species.py` | `20261116_0006_species_catalog.py`: `species` and its indexes |
| `20261116_0006_hcr_owner_required.py`, `20261116_0007_hcr_configurations.py` (create, move rules, drop the old table) | `20261116_0007_hcr_configurations.py`: `hcr_configurations` only |

The code of each table was moved from the old files, not retyped. The head id
`0007_hcr_configurations` is kept; the others are new.

**Verified** 2026-11-16 on throwaway PostgreSQL 17 databases:

- the old chain and the new one give the same `pg_dump --schema-only`;
- `alembic check`: no difference but the known `species_search_idx`
  expression index (Alembic compares expression indexes as text);
- the new chain downgrades to `0003_user_names` (left: the 0001 to 0003
  tables and the 4 enums of 0002) and upgrades again to the same schema;
- a database at the old head `0007_hcr_configurations` upgrades with the new
  chain as a no-op, with the same schema;
- a database at an old `0005_species` stops with "Can't locate revision".

**Deploy:** a database at an old 0004, 0005 or 0006 must reach the old head
first or be recreated; see [docs/CHANGELOG.md](../../CHANGELOG.md).

---

## 2026-11-13 — Startup log: URLs and every setting

**Status:** built (backend).

- `app.started` adds `public_base_url`, `docs_url` (Swagger UI),
  `openapi_url`, `console_url` (null when `CONSOLE_ENABLED=false`), `listen`
  and `sso_enabled`, next to version, controller, database and
  `sso_providers`.
- New event `app.config` right after it, and `worker.config` after
  `worker.started`: every setting grouped as `logging`, `http`, `database`
  (plus `effective_url`, password shown as `***`), `controller`, `catalog`,
  `queue`, `outputs`, `sessions`, `sign_in`, `retention`, `sso` (plus each
  provider's settings, `discovery` and `callback_url`), `first_admin`.
  Secrets show as `set` or `not set`.
- Files: `src/surimi_backend/startup.py` (new: `SECTIONS`, `urls`,
  `config_summary`, `DOCS_PATH`, `OPENAPI_PATH`), `main.py` (logs both
  events; FastAPI's docs paths now come from those constants),
  `scheduler/worker.py`, `tests/test_startup.py` (new).
- Tests: every `Settings` field in exactly one section; no secret value (JWT,
  database and admin passwords, S3 keys, OIDC client secret, `DATABASE_URL`
  password) and no admin e-mail in the summary; URLs with and without the
  console; a bad provider key reported, not raised.
- **Verified** 2026-11-13: one start of `create_app` with the fake controller
  and a Keycloak provider printed both events as JSON lines with the expected
  URLs and masked values. Ruff, format, mypy strict clean; 245 tests pass
  (integration included). Not checked on the compose stack.

---

## 2026-11-03 — Bootstrap: password on every start, configurable names; first real controller

**Status:** checked on the compose stack against the controller at
`user-<developer>-surimi-controller.lab.dive.edito.eu`: `/readyz` ready
(protocol `b10b05a0ca7f`), `/api/v1/scenarios` and the `northwestern_med`
contract come from the real controller through nginx, and the old Envoy path
answers 200. Bootstrap: password change takes effect, custom names work,
missing password exits 3. 3 integration tests pass.

- `deployments/postgres/bootstrap.sql` — names as psql variables `app_user`,
  `app_db` (defaults `surimi_modelgui`, `surimi_modelgui_db`); `ALTER ROLE …
  PASSWORD` on every run, with `NOSUPERUSER NOCREATEDB NOCREATEROLE`; a
  missing `app_password` raises an error instead of exiting 0.
- `deployments/compose.yml` — `POSTGRES_USER` configurable (default
  `postgres`); `db-bootstrap` passes `DB_NAME`, `DB_USER`, `DB_PASSWORD`.
- `deployments/.env.example` — when each password is applied.
- `resources/bruno/surimi-modelgui/environments/<developer>.yml` — new.

**Deploy:** nothing to migrate. A changed `DB_PASSWORD` now applies on the
next `up`; `POSTGRES_PASSWORD` still only on a new volume.

---

## 2026-11-03 — Stricter lint rules and the `/backend` skill

**Status:** Ruff (new rule set), Ruff format, mypy strict clean; 35 tests pass,
3 integration. No code change was needed beyond removing one unused `noqa`.

- `pyproject.toml` (root) — Ruff now also checks `BLE`, `N`, `C4`, `PT`, `RUF`,
  `TID` (absolute imports only), `RET`, `PTH`, `PIE`, `T20`, `ERA`, `DTZ`, `PL`,
  `FBT`; `PLR2004` ignored; per-file exceptions for tests, `cli.py` and
  `packages/proto/generate.py`, each with its reason; `docstring-code-format`.
- `packages/proto/generate.py` — unused `noqa: S404` removed.
- `.claude/skills/backend/SKILL.md` — new: backend conventions and the quality
  gate; `/feature` and `/record` now require the gate to pass.

---

## 2026-11-03 — FastAPI backend, PostgreSQL, controller client, scenarios API, compose and CI

**Status:** done on branch `feature/monorepo-and-backend`, not committed or
merged. Ruff, format and mypy strict clean; 35 tests pass, 3 of them against
PostgreSQL 17; compose stack runs end to end; real controller not reachable
(404 from EDITO), so only failure handling was checked against it; CI checked
with `actionlint`, not run on GitHub.

Root:

- `pyproject.toml` — new: uv workspace (`apps/backend`, `packages/proto`),
  Ruff config.
- `uv.lock`, `.python-version` (3.13) — new.
- `.gitattributes` — new: LF for generated stubs and shell scripts.
- `.gitignore` — Python caches and `.venv/`.
- `.dockerignore` — Python caches, `.venv`, backend tests.
- `.github/workflows/ci.yml` — jobs `backend`, `backend-image`, `proto-stubs`;
  GHA cache scopes per image.

`packages/proto/`:

- `pyproject.toml` — package `surimi-protocol`, pin `[tool.surimi-protocol]`
  `ref = b10b05a0ca7f4712a333392a7d431b25` (2026-10-20, `SURIMI-protocol@ee03680`).
- `generate.py` — `buf export` of the pin, `grpcio-tools` protoc for messages,
  `.pyi` and gRPC stubs; updates runtime lower bounds; writes LF.
- `src/surimi/`, `src/buf/` — generated, 77 protos.

`apps/backend/`:

- `pyproject.toml`, `alembic.ini`, `Dockerfile` — new.
- `src/surimi_backend/` — `main.py`, `cli.py`, `core/` (config, logging,
  db, errors), `api/health.py`, `catalog/` (service, router),
  `integrations/controller/` (base, grpc_client, fake, convert),
  `migrations/` (env, `0001_baseline`).
- `tests/` — `test_config.py`, `test_health.py`, `test_catalog.py`,
  `test_grpc_client.py`, `test_database.py` (integration).

`deployments/`:

- `compose.yml` — services `postgres`, `db-bootstrap`, `migrate`, `api`;
  `API_BASE_URL` for `web`; volume `postgres-data`.
- `postgres/bootstrap.sql` — moved here from `docs/database/`.
- `nginx/default.conf.template` — `location /api/v1/` to the API, request id
  map.
- `.env.example` — database, controller and API settings.

`apps/frontend/Dockerfile` — `ENV` defaults for `CONTROLLER_BASE_URL` and
`API_BASE_URL`, so the image works without compose setting them. No change
to the app.

`resources/bruno/surimi-modelgui/` — folder `api/` (healthz, readyz,
scenarios, scenario contract); `apiUrl` in `local`; new environment
`project-surimi`.

**Deploy:** new services start in order postgres → db-bootstrap → migrate →
api. Local passwords have `*-local-only` defaults; set `POSTGRES_PASSWORD` and
`DB_PASSWORD` in `deployments/.env` anywhere shared. The database lives in the
`surimi-modelgui_postgres-data` volume.
