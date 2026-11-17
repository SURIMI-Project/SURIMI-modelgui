# SURIMI model GUI

Web application of the SURIMI project: set up experiments, run them on the
SURIMI controller (EDITO datalab) and view their outputs.

This repository is a monorepo, built in phases following the
[plan](docs/plans/2026-11-03-monorepo-and-backend.md).

| Path | What it is |
| --- | --- |
| [apps/backend/](apps/backend/) | FastAPI backend (Python 3.13, uv): REST API under `/api/v1` |
| [apps/frontend/](apps/frontend/) | React + Vite + TypeScript app |
| [packages/proto/](packages/proto/) | Python stubs of the SURIMI controller protocol, generated |
| [deployments/](deployments/) | `compose.yml`, PostgreSQL bootstrap and nginx configuration, `.env.example` |
| [resources/bruno/](resources/bruno/) | Bruno API collection |
| [docs/](docs/README.md) | Architecture, plans, decisions, features, open issues |

## Run it with Docker (no Node.js needed)

Docker Desktop must be running. From the repository root:

```bash
docker compose -f deployments/compose.yml up --build -d
```

Open <http://localhost:18080>. To stop it:

```bash
docker compose -f deployments/compose.yml down
```

With npm installed, the same as shortcuts: `npm run docker:up`,
`npm run docker:down`, `npm run docker:logs`.

- The stack is the web app (nginx), the backend API, the worker, and
  PostgreSQL. On start, the database and its user are created and migrated,
  the first admin and the species list are loaded (`create-admin`,
  `seed-species`), then the API and the worker start.
- The worker polls the controller, sends queued experiments when enough
  Ecopath pods are free, and indexes finished runs' outputs. Set
  `ECOPATH_PODS` and `CONTROLLER_MSE_SIMULATIONS` to the controller's own
  values. Outputs are read from `OUTPUTS_URI`: the local
  `output_folder/experiments` by default, or an S3 bucket with `S3_*`
  (see `deployments/.env.example`; keep credentials in `deployments/.env`,
  which git ignores).
- The API answers under <http://localhost:18080/api/v1/> (OpenAPI docs at
  `/api/v1/docs`) and directly on <http://localhost:18082>. Without a reachable
  controller it uses a built-in fake (`CONTROLLER_MODE=fake`, the default); set
  `CONTROLLER_MODE=grpc` and `CONTROLLER_GRPC_URL` for a real one.
- The app is built once into static files and served by nginx; client-side
  routes such as `/scenario/...` survive a refresh.
- Settings go in `deployments/.env` (copy `deployments/.env.example`). For a
  one-off change: `SURIMI_PORT=19090 docker compose -f deployments/compose.yml up --build -d`.
- The frontend uses the backend REST API for authentication and scenario availability. Scientific inputs/results remain a fixed demo. Only the backend contacts the controller through native gRPC.

### Sign in to the API

Every API route except health and sign-in needs a user. The web app does not
have a sign-in page yet (phase 10). Use the backend console, Bruno, curl or
`/api/v1/docs`.

- **Backend console:** open <http://localhost:18080/api/v1/console/>. It is a
  page served by the API with password and SSO sign-in and tabs: your account
  and the scenarios, the species list, New experiment (choose a scenario, add
  harvest control rules from a dropdown, keep named HCR configurations, submit,
  follow and cancel runs, download a finished run's `.nc`), and for admins the
  users and the species import and export. It only calls the public
  API and is not the SURIMI frontend. Turn it off with `CONSOLE_ENABLED=false`.
  Design: [docs/features/backend-console](docs/features/backend-console/README.md).

- **First admin:** set `ADMIN_EMAIL`, `ADMIN_USERNAME`, `ADMIN_FIRST_NAME`,
  `ADMIN_LAST_NAME` and `ADMIN_PASSWORD` in `deployments/.env`. The `migrate` job creates that admin on every start
  (or makes the existing user admin).
- **Token for scripts and Bruno:**
  `curl -X POST http://localhost:18082/api/v1/auth/token -H 'Content-Type: application/json' -d '{"login": "admin", "password": "..."}'`,
  then send `Authorization: Bearer <access_token>`. In Bruno, run
  `api/auth/post token`.
- **SSO with a local Keycloak:** add `OIDC_PROVIDERS=keycloak` to
  `deployments/.env` and start with `--profile keycloak`. Then open the
  console and click "Sign in with Keycloak" (or open
  <http://localhost:18080/api/v1/auth/sso/keycloak/login>), and sign in as
  `alice` / `alice-local-only` (admin), `bob` / `bob-local-only` (member) or
  `carol` / `carol-local-only` (no access). The Keycloak console is at
  <http://localhost:18083> (`admin` / `admin-local-only`).

Design and every setting: [docs/features/auth-and-users](docs/features/auth-and-users/README.md).

## Develop the backend

uv 0.10 and Python 3.13 (`.python-version`). From the repository root:

```bash
uv sync --all-packages                       # install the uv workspace
cd apps/backend
uv run ruff check . && uv run ruff format --check . && uv run mypy
uv run pytest -q                             # needs Docker for the PostgreSQL tests
uv run pytest -q -m "not integration"        # without Docker
```

Run it against the compose database:
`docker compose -f deployments/compose.yml up -d postgres db-bootstrap migrate`,
then `DB_PORT=15432 DB_PASSWORD=surimi-local-only CONTROLLER_MODE=fake JWT_SECRET=<32+ characters> COOKIE_SECURE=false uv run surimi-backend serve`
(the compose `api` service is the same thing in a container). The controller
stubs are regenerated with
`uv run --package surimi-protocol python packages/proto/generate.py`; the
protocol version is pinned in `packages/proto/pyproject.toml`.

## Develop the frontend

Node.js 22 (`.nvmrc`). From the repository root:

```bash
npm install          # installs the workspace (apps/frontend)
npm run dev          # Vite dev server
npm run build        # typecheck and production build
npm run lint
```

Open the local URL printed by Vite after starting the development server.

Frontend settings for `npm run dev` go in `apps/frontend/.env` (copy
`apps/frontend/.env.example`).

### Fixed frontend demo

No `MOCK` flag, Envoy service or controller connection is needed. All three
case-study flows show the same fixed example simulation/report. Completing
inputs only navigates to the example list; it creates no run and stores nothing.
Comparison is disabled because there is only one example.

Datasets, species references and descriptive content live in
[apps/frontend/mock-data/](apps/frontend/mock-data/README.md). Ordinary UI labels
remain in components. The isolated `/netcdf-lab` file reader is retained.

The Axios/Zod request, typed services and TanStack foundation are implemented under
`apps/frontend/src/network/` and `src/serverState/`. Existing pages still use
fixtures for descriptive content/results; local login, session restoration, protected
routes and sign-out are connected to the existing backend. `/test` remains public.
Vite proxies `/api/v1` to `http://127.0.0.1:18082` by default. The local backend
uses the admin configured in git-ignored `deployments/.env`. Required password changes, configured SSO entry and real scenario availability
are connected. The backend handles SSO exchange. For local Vite callbacks, see
[SSO setup](docs/features/frontend-local-login/README.md#reproduce-local-vite-sso).
Experiment submission and scientific outputs are still demonstrative.
Run focused tests with `npm --workspace apps/frontend run test:network`. See
[the implementation plan](docs/implementation-plan/README.md).
Local login was tested against Docker; the wider product remains a development prototype.
See [local login verification](docs/features/frontend-local-login/CHANGELOG.md) for
the local-only workaround for the blocked GHCR build dependency.

The Buf CLI remains a root development dependency for Python protocol generation;
there are no frontend gRPC runtime or code-generation dependencies.

The signed-in case-selection page uses a cinematic geographic map with separate
case previews. Its previous video/cards view is preserved as an unused component.
See [T02 design and remaining boundary requirements](docs/features/case-study-map/README.md).

### Frontend design system

The light theme and shared controls use CSS semantic tokens and React Aria Components; Mantine has been removed. Sign in and open `/design-system` for Theme, UI components and actual report compositions. Login uses the same shared fields, buttons and card foundation. There is no dark theme or props playground. See [design-system architecture](docs/features/frontend-design-system/README.md) and [ADR 0018](docs/decisions/0018-frontend-css-tokens-and-react-aria.md).

The active case selector also uses the light theme, with procedural animated map water, pause/resume and reduced-motion/static fallback. Selected seas show official GFCM GSA 22 + 23 (Aegean) or 06 + 07 (Northwestern) boundaries. The equal-width selector sits over a wider overview; Anchovy Bay uses its full upright illustration with animated water beneath it.
