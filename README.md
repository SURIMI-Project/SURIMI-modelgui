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
| [deployments/](deployments/) | `compose.yml`, PostgreSQL bootstrap, nginx and Envoy configuration, `.env.example` |
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

- The stack is the web app (nginx), the backend API, and PostgreSQL. On start,
  the database and its user are created and migrated before the API starts.
- The API answers under <http://localhost:18080/api/v1/> (OpenAPI docs at
  `/api/v1/docs`) and directly on <http://localhost:18082>. Without a reachable
  controller it uses a built-in fake (`CONTROLLER_MODE=fake`, the default); set
  `CONTROLLER_MODE=grpc` and `CONTROLLER_GRPC_URL` for a real one.
- The app is built once into static files and served by nginx; client-side
  routes such as `/scenario/...` survive a refresh.
- Settings go in `deployments/.env` (copy `deployments/.env.example`). For a
  one-off change: `SURIMI_PORT=19090 docker compose -f deployments/compose.yml up --build -d`.
- To reach a controller, also start the gRPC-Web proxy and set
  `CONTROLLER_GRPC_URL`:
  `docker compose -f deployments/compose.yml --profile grpc-proxy up --build -d`.

### Sign in to the API

Every API route except health and sign-in needs a user. The web app does not
have a sign-in page yet (phase 10); use Bruno, curl or `/api/v1/docs`.

- **First admin:** set `ADMIN_EMAIL`, `ADMIN_USERNAME`, `ADMIN_FIRST_NAME`,
  `ADMIN_LAST_NAME` and `ADMIN_PASSWORD` in `deployments/.env`. The `migrate` job creates that admin on every start
  (or makes the existing user admin).
- **Token for scripts and Bruno:**
  `curl -X POST http://localhost:18082/api/v1/auth/token -H 'Content-Type: application/json' -d '{"login": "admin", "password": "..."}'`,
  then send `Authorization: Bearer <access_token>`. In Bruno, run
  `api/auth/post token`.
- **SSO with a local Keycloak:** add `OIDC_PROVIDERS=keycloak` to
  `deployments/.env` and start with `--profile keycloak`. Then open
  <http://localhost:18080/api/v1/auth/sso/keycloak/login> and sign in as
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

### Mock mode (controller down)

Set `MOCK=true` to use canned controller responses
(`apps/frontend/src/lib/services/controllerMock.ts`) instead of calling the
controller. It defaults to `false` and is read at build time:

```bash
MOCK=true npm run dev
MOCK=true docker compose -f deployments/compose.yml up --build -d
```

## Pastebin

### Controller interface

```
{
  "scenario_names": [
    "aegean_sea",
    "anchovy_bay",
    "northwestern_med"
  ]
}
```

```
{
  "simulation_statuses": [
    {
      "simulation_id": "3eb1efa6-e7c9-4ae0-a825-8a31f4cfbdaf",
      "experiment_id": "126fb98f-9d38-48b3-af2f-e65ee5fa9f57",
      "scenario_name": "northwestern_med",
      "start_date_time": {
        "seconds": "1356998400"
      },
      "end_date_time": {
        "seconds": "1483228800"
      },
      "status": "Finished",
      "simulation_started": {
        "seconds": "1791797504",
        "nanos": 584793700
      },
      "simulation_duration": {
        "seconds": "494",
        "nanos": 415330400
      },
      "simulation_current": {
        "seconds": "1483228800"
      },
      "ecology_host": "http://::ffff:10.100.241.13:7890",
      "order": 9
    },
    {
      "simulation_id": "a3269372-3957-4525-8439-19ef166c31a3",
      "experiment_id": "126fb98f-9d38-48b3-af2f-e65ee5fa9f57",
      "scenario_name": "northwestern_med",
      "start_date_time": {
        "seconds": "1356998400"
      },
      "end_date_time": {
        "seconds": "1483228800"
      },
      "status": "Finished",
      "simulation_started": {
        "seconds": "1791797504",
        "nanos": 583828800
      },
      "simulation_duration": {
        "seconds": "525",
        "nanos": 667505600
      },
      "simulation_current": {
        "seconds": "1483228800"
      },
      "ecology_host": "http://::ffff:10.100.10.123:7890",
      "order": 8
    },
    {
      "simulation_id": "27cd3a70-9734-4b0b-ba2c-f86a0ff8873a",
      "experiment_id": "126fb98f-9d38-48b3-af2f-e65ee5fa9f57",
      "scenario_name": "northwestern_med",
      "start_date_time": {
        "seconds": "1356998400"
      },
      "end_date_time": {
        "seconds": "1483228800"
      },
      "status": "Finished",
      "simulation_started": {
        "seconds": "1791797504",
        "nanos": 582940900
      },
      "simulation_duration": {
        "seconds": "678",
        "nanos": 743871900
      },
      "simulation_current": {
        "seconds": "1483228800"
      },
      "ecology_host": "http://::ffff:10.100.84.204:7890",
      "order": 7
    },
    {
      "simulation_id": "08a73122-c7bf-44d6-b2bc-08bf6b4999c3",
      "experiment_id": "126fb98f-9d38-48b3-af2f-e65ee5fa9f57",
      "scenario_name": "northwestern_med",
      "start_date_time": {
        "seconds": "1356998400"
      },
      "end_date_time": {
        "seconds": "1483228800"
      },
      "status": "Finished",
      "simulation_started": {
        "seconds": "1791797504",
        "nanos": 581793300
      },
      "simulation_duration": {
        "seconds": "493",
        "nanos": 514987700
      },
      "simulation_current": {
        "seconds": "1483228800"
      },
      "ecology_host": "http://::ffff:10.100.59.98:7890",
      "order": 6
    },
    {
      "simulation_id": "d0b029f3-cf75-4717-8e76-8598bcae5e06",
      "experiment_id": "126fb98f-9d38-48b3-af2f-e65ee5fa9f57",
      "scenario_name": "northwestern_med",
      "start_date_time": {
        "seconds": "1356998400"
      },
      "end_date_time": {
        "seconds": "1483228800"
      },
      "status": "Finished",
      "simulation_started": {
        "seconds": "1791797504",
        "nanos": 580631700
      },
      "simulation_duration": {
        "seconds": "525",
        "nanos": 589541300
      },
      "simulation_current": {
        "seconds": "1483228800"
      },
      "ecology_host": "http://::ffff:10.100.110.140:7890",
      "order": 5
    },
    {
      "simulation_id": "542086b9-be6d-4824-be84-f5e6d86e36a3",
      "experiment_id": "cccd6c0c-d6d4-4dcb-b2d8-91c220c71dde",
      "scenario_name": "northwestern_med",
      "start_date_time": {
        "seconds": "1356998400"
      },
      "end_date_time": {
        "seconds": "1483228800"
      },
      "status": "Finished",
      "simulation_started": {
        "seconds": "1791387948",
        "nanos": 423962600
      },
      "simulation_duration": {
        "seconds": "347",
        "nanos": 300535100
      },
      "simulation_current": {
        "seconds": "1483228800"
      },
      "ecology_host": "http://::ffff:10.100.59.98:7890",
      "order": 4
    },
    {
      "simulation_id": "ef840beb-f646-4390-9fb3-492ac82e76e1",
      "experiment_id": "f5599adb-f62b-4ed2-81c1-9099c983ca3a",
      "scenario_name": "northwestern_med",
      "start_date_time": {
        "seconds": "1356998400"
      },
      "end_date_time": {
        "seconds": "1483228800"
      },
      "status": "Initialised",
      "simulation_started": {
        "seconds": "1791387524",
        "nanos": 932931300
      },
      "simulation_duration": {
        "nanos": 10000000
      },
      "ecology_host": "http://::ffff:10.100.182.199:7890",
      "order": 3
    },
    {
      "simulation_id": "032cacf7-b723-4715-985f-0f582b4c193c",
      "experiment_id": "8cba041c-9c20-4e58-ae71-4ca0c758c742",
      "scenario_name": "northwestern_med",
      "start_date_time": {
        "seconds": "1356998400"
      },
      "end_date_time": {
        "seconds": "1483228800"
      },
      "status": "Finished",
      "simulation_started": {
        "seconds": "1791387520",
        "nanos": 28572100
      },
      "simulation_duration": {
        "seconds": "465",
        "nanos": 113752000
      },
      "simulation_current": {
        "seconds": "1483228800"
      },
      "ecology_host": "http://::ffff:10.100.110.140:7890",
      "order": 2
    },
    {
      "simulation_id": "53a61028-0e3f-4152-88b2-63eecf88d935",
      "experiment_id": "6a872f58-3c3a-453a-9ee3-ea8ccf125c22",
      "scenario_name": "northwestern_med",
      "start_date_time": {
        "seconds": "1356998400"
      },
      "end_date_time": {
        "seconds": "1483228800"
      },
      "status": "Initialised",
      "simulation_started": {
        "seconds": "1791387505",
        "nanos": 798536600
      },
      "simulation_duration": {
        "nanos": 10000000
      },
      "ecology_host": "http://::ffff:10.100.69.9:7890",
      "order": 1
    }
  ]
}
```
