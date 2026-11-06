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
| [0007](0007-scheduler-worker-postgres-queue.md) | Worker polls the controller; jobs and schedules on PostgreSQL with Procrastinate | Proposed 2026-11-03 |
| [0008](0008-notifications-sse.md) | Notifications over SSE fed by `LISTEN/NOTIFY` | Proposed 2026-11-03 |
| [0009](0009-output-storage-and-ingestion.md) | Outputs stay in their files, read in place by chunk (fsspec + kerchunk index); nothing copied into the database; presigned URLs for raw downloads | Proposed 2026-11-03 |
| [0010](0010-observability-and-activity-tracking.md) | structlog, Prometheus, OpenTelemetry; user activity in the database | Proposed 2026-11-03 |
| [0011](0011-controller-stubs-from-buf-registry.md) | Controller stubs from `buf.build/surimi/surimi-protocol`, pinned | Proposed 2026-11-03 |
| [0012](0012-docs-as-code-with-mermaid.md) | Docs as code: features with Decisions tables, ADRs, plans, issues, Mermaid, DBML | Proposed 2026-11-03 |
| [0013](0013-data-retention.md) | Retention: logs 30 days, sign-ins 13 months then monthly roll-up, IPs 90 days, audit 24 months | Proposed 2026-11-03 |
| [0014](0014-postgresql-in-repo-bundled-or-external.md) | PostgreSQL in the repo; Helm bundled or external; database `surimi_modelgui_db`, one application user | Proposed 2026-11-03 |
| [0015](0015-experiment-admission-queue.md) | Experiments wait in a fair queue in our database until enough Ecopath pods are free | Proposed 2026-11-03 |
| [0016](0016-separate-sso-and-local-accounts.md) | SSO and local users are separate accounts, never linked; unique verified e-mail; the provider owns an SSO user's e-mail and names | Accepted 2026-11-04 |
| [0017](0017-frontend-axios-zod-and-query-layers.md) | Frontend Axios request + Zod contracts, services and TanStack hooks; defer OpenAPI client generation | Accepted 2026-11-05 |
| [0018](0018-frontend-css-tokens-and-react-aria.md) | CSS semantic tokens, light theme and project-owned React Aria controls; remove Mantine | Accepted 2026-11-06 |
