# 0002 — Backend in Python 3.13 with FastAPI, fully async

**Status:** Proposed
**Date:** 2026-11-03
**Related:** [plan](../plans/2026-11-03-monorepo-and-backend.md), [0003](0003-postgresql-sqlalchemy-alembic.md), [0009](0009-output-storage-and-ingestion.md)

## Context

- The backend must be async, call a gRPC service, hold persistent data, push
  notifications and read simulation outputs.
- Outputs are NetCDF (`.nc`, 311 MB for a 205-month run) plus a 1.3 GB `.bin`
  of length-prefixed protobuf messages. **Verified** 2026-11-03 on
  `output_folder/experiments/99c1e2a4…`.
- The frontend needs a typed contract for the API, and the admin pages need
  filtering, paging and statistics that are ours to define.

## Decision

Python 3.13, FastAPI with Pydantic v2, served by uvicorn. All I/O async:
SQLAlchemy 2 async with asyncpg, `grpc.aio` for the controller, `httpx` for
Keycloak, `s3fs` for storage. CPU-heavy work (NetCDF parsing) runs in the worker
process, never in the API event loop. Package `surimi_backend` in
`apps/backend/src/`, managed with uv; Ruff for lint and format, mypy strict on
new code, pytest with `pytest-asyncio`.

## Why

- **NetCDF is the deciding factor.** `xarray` with `netCDF4` or `h5netcdf` is
  the standard way to read NetCDF4/HDF5 and handles lazy, chunked reads of large
  files. Node's `netcdfjs` reads only classic NetCDF3; Go and Java have no
  equivalent of xarray.
- FastAPI is async-first and generates OpenAPI 3.1 from the Pydantic models,
  which gives the frontend typed clients (ADR 0006) without writing the
  contract twice.
- `grpcio` has an official asyncio API and Buf generates Python stubs.
- One language for API, worker and data processing: the output-reading code and the
  API share the models.

## Alternatives considered

| Option | Why not |
| --- | --- |
| Django + Django Ninja | Gives an admin site and auth for free, but the admin UI must be in the React app anyway (filters by user, stats); Django's ORM is only partly async, and its usual task queue (Celery) is not asyncio-native |
| Node.js (NestJS or Fastify) | Shares TypeScript with the frontend, but cannot read NetCDF4 well; output processing would need a Python sidecar anyway |
| Go | Excellent gRPC and concurrency, but no scientific data stack to read NetCDF |
| Litestar | Comparable to FastAPI, with a smaller community and fewer examples and integrations to draw on |

## Consequences

- The frontend gets its types from OpenAPI instead of sharing source code.
- Blocking libraries (`netCDF4`, `boto3`) must stay in the worker or in
  `asyncio.to_thread`.
- Python 3.13 in the Docker image (`python:3.13-slim`) and in CI.
