# Features

One folder per feature. `README.md` holds the design (use cases, behaviour,
API, decisions, open questions); `CHANGELOG.md` logs every change, newest
first, and is created with the first code change. Start a new feature with
`/feature`, from [_template/](_template/README.md).

| Folder | What it covers | Phase | Status |
| --- | --- | --- | --- |
| [frontend-design-system/](frontend-design-system/README.md) | Light tokens, shared React Aria controls, login and visual component preview | Frontend design | Implemented 2026-11-06; visual palette review ongoing |
| [case-study-map/](case-study-map/README.md) | Signed-in geographic overview, cinematic case previews and preserved previous cards | T02 | Implemented for visual review; Aegean GSA 22 + 23 confirmed 2026-11-06; Northwestern GSA 06 + 07 displayed from official source; final visual/scientific review pending |
| [frontend-local-login/](frontend-local-login/README.md) | Local/SSO login, password completion, session protection and real availability through existing API | T06 local integration | Implemented and browser-tested 2026-11-05; callback-denial presentation follow-up |
| [frontend-network/](frontend-network/README.md) | Centralized Axios/Zod request, auth/scenario services and TanStack hooks | T06 foundation | Implemented 2026-11-05; local/SSO auth and catalogue verified |
| [Frontend gRPC cleanup](../implementation-plan/T05-remove-frontend-grpc.md) | T05 browser gRPC removal; centralized fixtures; one shared demo report, no run creation | Frontend cleanup | Implemented 2026-11-05; auth/REST next |
| [monorepo-restructure/](monorepo-restructure/README.md) | Move the app to `apps/frontend`, workspaces, `deployments/`, CI | 1 | Done 2026-11-03 on `develop`, not merged into `main` |
| [backend-skeleton/](backend-skeleton/README.md) | FastAPI app, settings, JSON logs with request ids, PostgreSQL bootstrap and migrations, health, controller client (gRPC and fake), pinned stubs, `/api/v1/scenarios`, compose and CI | 2 | Done 2026-11-03 on `develop`, not merged into `main` |
| [auth-and-users/](auth-and-users/README.md) | Local and OIDC sign-in (Keycloak first), sessions, `admin`/`member` roles synced from SSO claims, admin user management | 3 | Built 2026-11-03 (backend and API) on `develop`, not merged into `main` |
| [experiments/](experiments/README.md) | Submit, list, cancel, clone, admin view and filters, validation against the contract | 4 | Planned 2026-11-03 |
| [experiment-queue/](experiment-queue/README.md) | Fair admission queue counted in Ecopath pods (MSE = 5, non-MSE = 1, 10 total); position, priority, stall flag | 5 | Planned 2026-11-03 |
| [simulation-status-scheduler/](simulation-status-scheduler/README.md) | Worker that polls the controller, maps statuses, flags stalls and lost runs, starts output indexing | 5 | Planned 2026-11-03 |
| [notifications/](notifications/README.md) | SSE stream of experiment events with replay | 5 | Planned 2026-11-03 |
| [experiment-outputs/](experiment-outputs/README.md) | Read `.nc` in place by chunk from S3 or local; charts and maps on request, no copy in the database; presigned raw downloads | 6 | Planned 2026-11-03 |
| [observability-and-activity/](observability-and-activity/README.md) | Logs, metrics, traces, health, per-user activity statistics, audit log | 7 | Planned 2026-11-03 |

Project-wide docs are one level up: [ARCHITECTURE.md](../ARCHITECTURE.md),
[ISSUES.md](../ISSUES.md), [CHANGELOG.md](../CHANGELOG.md),
[plans/](../plans/README.md), [decisions/](../decisions/README.md).
