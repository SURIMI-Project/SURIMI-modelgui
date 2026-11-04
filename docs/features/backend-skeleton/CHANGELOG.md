# Backend skeleton — changelog

Every change made for this feature, newest first. Each entry says what changed,
where, how it was checked and what deploying it needs. Design is in
[README.md](README.md).

---

## 2026-11-03 — Bootstrap: password on every start, configurable names; first real controller

**Status:** checked on the compose stack against the controller at
`user-alexiosgkikas-surimi-controller.lab.dive.edito.eu`: `/readyz` ready
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
- `resources/bruno/surimi-modelgui/environments/alexiosgkikas.yml` — new.

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
