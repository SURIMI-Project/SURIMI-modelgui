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
| [backend-console/](backend-console/README.md) | Static page served by the API at `/api/v1/console/`: password and SSO sign-in, tabs for the account and scenarios, species (search, filter, sort), New experiment (species and HCRs from a dropdown, named HCR configurations, submit, cancel, download the `.nc`) and (admins) users and species import and export. Calls only the public API, not the phase 10 frontend | 3 to 9 helper | Built 2026-11-06 on `develop`, not merged into `main`; species pages, tabs and the New experiment tab 2026-11-16 |
| [scenario-catalog/](scenario-catalog/README.md) | Per-scenario functional groups (named from the EwE models), species names, HCR-eligible entries, climate scenarios and output level per metric, checked against the contract; initial biomass and fishing mortality asked from the controller | 4 | Built 2026-11-05 (backend and API), initial values 2026-11-12, on `develop`, not merged into `main`; redesign (database and admin workbook, ADR 0023) designed 2026-11-13; steps 1 and 2 (the `species` table, admin CSV import and export) built 2026-11-16 |
| [harvest-control-rules/](harvest-control-rules/README.md) | Users' own named HCR configurations, several per scenario (rules in `jsonb`, biomass in kg); no scenario defaults; validation against the catalog and the protocol's bounds | 4 | Built 2026-11-06 (backend and API), bounds 2026-11-12, kg 2026-11-13, defaults removed and configurations 2026-11-16, on `develop`, not merged into `main` |
| [experiments/](experiments/README.md) | Submit (rules as given or an HCR configuration), list, cancel, clone, admin view and filters, validation against the contract; the form's options (every contract species, the user's configurations) | 4 | Built 2026-11-06 (backend and API) on `develop`, not merged into `main`; experiment options 2026-11-16 |
| [experiment-queue/](experiment-queue/README.md) | Fair admission queue counted in Ecopath pods (MSE = 5, non-MSE = 1, 10 total); position, priority, stall flag | 5 | Built 2026-11-06 (backend and API) on `develop`, not merged into `main` |
| [simulation-status-scheduler/](simulation-status-scheduler/README.md) | Worker that polls the controller, maps statuses, flags stalls and lost runs; a finished run is `copying_results` until its results are indexed, then `completed` | 5 | Built 2026-11-06 (worker), `copying_results` 2026-11-12, on `develop`, not merged into `main` |
| [notifications/](notifications/README.md) | Experiment events polled from a cursor (`GET /api/v1/events?after=`); SSE replaced 2026-11-12 (ADR 0021) | 5 | Built 2026-11-06 (backend), polling 2026-11-12, on `develop`, not merged into `main` |
| [experiment-outputs/](experiment-outputs/README.md) | Read `.nc` in place by chunk from S3 or local; charts and maps on request, no copy in the database; presigned raw downloads (1 hour), by redirect or as JSON | 6 | Built 2026-11-06 (backend and API) on `develop`, not merged into `main`; dashboards phase 10 |
| [observability-and-activity/](observability-and-activity/README.md) | Logs, Prometheus metrics (API and worker), OpenTelemetry traces, health, per-user activity statistics, audit log, retention purge; compose profile `observability` (Prometheus, Grafana, Jaeger) | 7 | Built 2026-11-17 (backend, API, compose) on `develop`, not merged into `main`; admin pages phase 10 |

Project-wide docs are one level up: [ARCHITECTURE.md](../ARCHITECTURE.md),
[ISSUES.md](../ISSUES.md), [CHANGELOG.md](../CHANGELOG.md),
[plans/](../plans/README.md), [decisions/](../decisions/README.md).
