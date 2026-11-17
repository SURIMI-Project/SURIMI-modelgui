# Architecture decisions

One file per decision. A decision is `Proposed` until the user accepts it, then
`Accepted` with the date, and is never edited afterwards except to mark it
`Superseded by NNNN`. Write new ones with `/decision`, from
[_template.md](_template.md).

| ADR | Decision | Status |
| --- | --- | --- |
| [0001](0001-monorepo-layout-and-tooling.md) | One repo with `apps/`, `packages/`, `deployments/`; npm and uv workspaces | Proposed 2026-11-03 |
| [0002](0002-backend-python-fastapi.md) | Backend in Python 3.13 with FastAPI, fully async | Proposed 2026-11-03 |
| [0003](0003-postgresql-sqlalchemy-alembic.md) | PostgreSQL 17, SQLAlchemy 2 async, Alembic | Proposed 2026-11-03 |
| [0004](0004-authentication-local-and-oidc.md) | Local password and generic OIDC SSO (Keycloak first) both end in one backend-issued session | Accepted 2026-11-03, built in phase 3; account matching superseded by 0016 |
| [0005](0005-authorization-roles-and-ownership.md) | Roles `admin` and `member`, mapped from SSO claims at every sign-in; ownership in the repository layer | Proposed 2026-11-03 |
| [0006](0006-protocols-rest-sse-grpc.md) | REST/JSON browser ↔ backend; native gRPC backend → controller; remove gRPC-Web | Proposed 2026-11-03 |
| [0007](0007-scheduler-worker-postgres-queue.md) | Worker polls the controller; jobs and schedules on PostgreSQL with Procrastinate | Superseded by 0019 |
| [0008](0008-notifications-sse.md) | Notifications over SSE fed by `LISTEN/NOTIFY` | Superseded by 0021 |
| [0009](0009-output-storage-and-ingestion.md) | Outputs stay in their files, read in place by chunk (fsspec + kerchunk index); nothing copied into the database; presigned URLs for raw downloads | Proposed 2026-11-03; kerchunk superseded by 0020 |
| [0010](0010-observability-and-activity-tracking.md) | structlog, Prometheus, OpenTelemetry; user activity in the database | Accepted 2026-11-17 |
| [0011](0011-controller-stubs-from-buf-registry.md) | Controller stubs from `buf.build/surimi/surimi-protocol`, pinned | Proposed 2026-11-03 |
| [0012](0012-docs-as-code-with-mermaid.md) | Docs as code: features with Decisions tables, ADRs, plans, issues, Mermaid, DBML | Proposed 2026-11-03 |
| [0013](0013-data-retention.md) | Retention: logs 30 days, sign-ins 13 months then monthly roll-up, IPs 90 days, audit 24 months | Proposed 2026-11-03 |
| [0014](0014-postgresql-in-repo-bundled-or-external.md) | PostgreSQL in the repo; Helm bundled or external; database `surimi_modelgui_db`, one application user | Proposed 2026-11-03 |
| [0015](0015-experiment-admission-queue.md) | Experiments wait in a fair queue in our database until enough Ecopath pods are free | Proposed 2026-11-03; its job queue and lock replaced by 0019 |
| [0016](0016-separate-sso-and-local-accounts.md) | SSO and local users are separate accounts, never linked; unique verified e-mail; the provider owns an SSO user's e-mail and names | Accepted 2026-11-04 |
| [0017](0017-scenario-catalog-from-partner-config.md) | Each scenario's functional groups, species, HCR eligibility and output levels come from a catalog file generated from the partners' config and checked against the contract | Accepted 2026-11-05; storage and upkeep superseded by 0023 |
| [0018](0018-harvest-control-rules-per-user-and-scenario.md) | Harvest control rules stored per user and scenario, scenario defaults, copied into each experiment | Proposed 2026-11-05; unit (tonnes) superseded by 0022; defaults superseded by 0024; storage (one row per rule) superseded by 0025 |
| [0019](0019-worker-row-driven-with-advisory-lock.md) | The worker is a row-driven loop; one leader by PostgreSQL advisory lock; no job queue library | Proposed 2026-11-06 |
| [0020](0020-own-chunk-index-built-with-h5py.md) | Output chunk index built with h5py's chunk API and read by our own decoder, not kerchunk and zarr | Proposed 2026-11-06 |
| [0021](0021-notifications-by-polling.md) | Clients poll experiment events from a cursor (`GET /api/v1/events?after=`); no SSE stream | Accepted 2026-11-12 |
| [0022](0022-hcr-biomass-in-kg-tonnes-only-in-the-ui.md) | Harvest control rule biomass is kg in the database, API and stored requests; tonnes only in the UI | Accepted 2026-11-13 |
| [0023](0023-scenario-catalog-in-the-database-from-an-admin-workbook.md) | Scenario catalog in the database, maintained by admins through one Excel workbook (global species, per-scenario groups and HCR eligibility); a default workbook ships with the system | Accepted 2026-11-13; import details Proposed |
| [0024](0024-harvest-control-rules-only-per-user-no-defaults.md) | Harvest control rules are only each user's own, per scenario, saved as a whole set; no scenario defaults, no admin routes, no seed | Accepted 2026-11-16; one set per scenario superseded by 0025 |
| [0025](0025-several-named-hcr-configurations-per-scenario-in-jsonb.md) | Several named HCR configurations per user and scenario, their rules in a `jsonb` column; experiments take one by id or rules as given | Accepted 2026-11-16 |
| [0026](0026-develop-deployment-self-hosted-runner-compose.md) | Deploy `develop` from a self-hosted runner: build the changed images on the host as `:develop` (plus commit tags), roll only what changed; `compose.yml` (images) and `compose.local.yml` (builds) | Proposed 2026-11-17 |
