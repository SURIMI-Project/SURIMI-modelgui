---
name: backend
description: Conventions and quality gate for Python code in the SURIMI model GUI backend (apps/backend, packages/proto): module layout, async rules, settings, errors, logging, controller access, database and migrations, API and schema style, tests, and the lint, format, type and test checks that must pass before backend work is done. Use whenever writing, changing or reviewing backend Python code, adding an endpoint, table, migration, setting or test, or when the user types /backend.
---

# Backend conventions and quality gate

The rules below describe how `apps/backend` is written. Lint and format rules
live in the root `pyproject.toml` (`[tool.ruff]`), types in
`apps/backend/pyproject.toml` (`[tool.mypy]`, strict). CI fails on any
finding, so the gate at the end is not optional.

## 1. Where code goes

One folder per area under `src/surimi_backend/`:

| File | Holds | Must not |
| --- | --- | --- |
| `router.py` | HTTP: path, method, `response_model`, dependencies, status codes | Run SQL or call the controller directly |
| `service.py` | Rules of the area; calls repositories and integrations | Know about HTTP (`Request`, status codes) |
| `repository.py` | SQL for one area; ownership scope (ADR 0005) | Check roles other than the ownership scope |
| `models.py` | SQLAlchemy tables (`Mapped[...]`, `mapped_column`) on `core.db.Base` | Hold logic |
| `schemas.py` | Pydantic request and response models | Import SQLAlchemy |

Cross-cutting code is in `core/` (config, db, errors, logging); outside
systems in `integrations/` (the controller today). Imports are absolute
(`from surimi_backend.core.errors import AppError`); Ruff bans relative ones.

## 2. Async

- Every route and every I/O function is `async def`.
- No blocking calls on the event loop: no `time.sleep`, `requests`, sync file
  reads of large files, or CPU-heavy work (NetCDF parsing goes to the worker or
  `asyncio.to_thread`). Ruff's `ASYNC` rules catch the common cases.
- Bound waits with `async with asyncio.timeout(...)` at the call site; do not
  add `timeout` parameters to async functions (ASYNC109).

## 3. Settings

- Every setting is a field of `core.config.Settings`, read from an env var of
  the same name in upper case. No `os.environ` anywhere else.
- A new setting also goes into `deployments/.env.example`, the feature
  README's configuration table, and `deployments/compose.yml` if compose must
  pass it.
- Secrets are `SecretStr`; never log them.

## 4. Errors

- Raise a subclass of `core.errors.AppError` with a `status_code` and a stable
  `code` (`not_found`, `controller_unavailable`, …). The handler turns it into
  `{"error": {code, message, details, request_id}}`.
- Never return a raw exception or a traceback to the client.
- `except Exception` only where a failure must not propagate (health checks),
  with `# noqa: BLE001 - <reason>`.

## 5. Logging

- `log = structlog.get_logger("surimi.<area>")`; events are dotted names
  (`experiment.submitted`), data goes in keyword fields, not in the message.
- Request id and other context come from `structlog.contextvars`; do not pass
  them by hand.
- No `print()` (except `cli.py`), no passwords, tokens, cookies or full
  request bodies (ADR 0013).

## 6. Controller

- Only through the `ControllerClient` protocol
  (`integrations/controller/base.py`), obtained from `app.state.controller`.
- Every gRPC call has a deadline; only read-only calls are retried, and only on
  `UNAVAILABLE`. Calls that change state are never retried.
- A new RPC is added to the protocol, `GrpcControllerClient`,
  `FakeControllerClient` and `tests/test_grpc_client.py` together.
- Behaviour of the controller is checked in its source first (`/surimi-services`).

## 7. Database

- Tables are SQLAlchemy 2 typed models on `core.db.Base`; constraint names
  follow its naming convention.
- Every schema change is an Alembic revision:
  `cd apps/backend && uv run alembic revision --autogenerate -m "<what>"`,
  then read and fix the generated file. Partial, `DESC`, `INCLUDE`, GIN and
  `NULLS NOT DISTINCT` indexes are written by hand as in
  `docs/database/indexes.sql`.
- No PostgreSQL extensions (ADR 0014).
- Every index serves a query listed in `docs/database/README.md` § Indexing;
  update that table, `indexes.sql` and the DBML (regenerated, see
  `docs/database/README.md`).
- Datetimes are timezone-aware UTC (`datetime.now(UTC)`, `timestamptz`); Ruff's
  `DTZ` rules reject naive ones.

## 8. API and schemas

- Routes under `/api/v1/<area>`, with `tags`, `summary`, `response_model`, and
  `responses` for documented errors.
- Schemas are named `<Entity>In` (create), `<Entity>UpdateIn` (partial
  update), `<Entity>Out` (response); give fields `examples` so the OpenAPI
  document and Bruno show real values.
- Every new or changed endpoint updates the Bruno collection (`/bruno`).
- No frontend code for new features before phase 10 (CLAUDE.md).

## 9. Tests

- Unit tests use `FakeControllerClient` and `create_app(settings, controller=...)`.
- Code that talks gRPC is tested against an in-process `grpc.aio` server, as in
  `tests/test_grpc_client.py`.
- Code that needs PostgreSQL is marked `@pytest.mark.integration` and uses the
  container fixture of `tests/test_database.py`.
- From phase 3, every endpoint that touches user data is tested as owner,
  another member, and admin.

## 10. Type hints

Every function is fully annotated; mypy runs in strict mode. `# type: ignore`
only with the error code and a reason, for untyped generated code.

## 11. Quality gate (must pass before saying the work is done)

From the repository root:

```bash
uv sync --all-packages
uv run ruff check apps/backend packages/proto/generate.py
uv run ruff format --check apps/backend packages/proto/generate.py
cd apps/backend
uv run mypy
uv run pytest -q          # with Docker; -m "not integration" without
```

If the protocol pin changed:
`uv run --package surimi-protocol python packages/proto/generate.py` and
review the diff of `packages/proto/src`.

Rules for the gate:

- Fix findings; do not silence them. `ruff check --fix` and `ruff format` are
  fine for what they fix.
- A `noqa` or `type: ignore` names the rule and gives the reason on the same
  line. A new per-file exception goes into the root `pyproject.toml` with a
  comment saying why.
- Report the result of each command in the feature `CHANGELOG.md` entry
  ("Ruff, format, mypy strict clean; 41 tests pass, 3 integration"). If a step
  could not run (no Docker), say so; never claim it passed.
- Files are LF (CLAUDE.md § Line endings).
