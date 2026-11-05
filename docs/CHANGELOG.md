# Changelog

Notable user-visible changes and deploy steps, newest first. Each entry says
what changed, why, and what deploying it needs. Feature detail is in
`docs/features/<name>/CHANGELOG.md`; open defects are in
[ISSUES.md](ISSUES.md).

Format:

```
## YYYY-MM-DD

### Feature — <title>   (or ### Fix — <title>)

What changed and why. Link to the feature folder.

> **Deploying this:** migrations, env vars, order of rollout.
```

---

## 2026-11-05

### Feature — Password completion, Keycloak SSO and real case availability

Users with temporary passwords can now complete the required change and enter their requested page. Login offers configured SSO providers; Keycloak code/token exchange stays in the backend. Case selection uses the authenticated REST catalogue with distinct loading/error/unavailable states and retry. Live password/SSO/catalogue and controlled error states were browser-tested. Scientific reports and experiment submission remain demo implementations.

> **Local SSO:** ignored local settings use `PUBLIC_BASE_URL=http://localhost:5173`; the same callback must be registered on the local Keycloak client. Tracked backend/protocol/CI/deployment files are unchanged. Callback denials still display backend JSON; see ISSUES. Setup and verification are in the frontend-local-login feature.

### Feature — Local frontend login and protected access

Local username/email/password login now uses the existing backend cookie session. Session restoration, deep-link return, protected content and sign-out are connected. `/test` remains public; `/netcdf-lab` requires login. Existing scientific/demo data is unchanged. SSO, password-change completion and scenario availability remain deferred. See [local login](features/frontend-local-login/README.md).

> **Local development:** start the existing API/database and Vite. Vite proxies `/api/v1` to `127.0.0.1:18082`. Backend/protocol/deployment files are unchanged. The GHCR uv image denial required a temporary local-only build workaround; details and live verification are in the feature changelog.

### Change — Frontend REST request and server-state foundation

Added centralized Axios/Zod transport, typed auth/catalogue services, and TanStack query/mutation hooks. Removed copied examples from another project. Existing demo pages still make no API requests; login UI and live integration remain pending. See [frontend network](features/frontend-network/README.md) and ADR 0017. Backend/protocol/CI/deployment files are unchanged.

> **Developing this:** install updated frontend dependencies with `npm ci`; run `npm --workspace apps/frontend run test:network` for focused tests.

### Change — Frontend uses one shared demo report without browser gRPC

All three case studies are navigable and show the same labelled example simulation/report. Setup creates no run and stores nothing; fake execution delay and output variants were removed. Fixtures, species references and descriptive content are centralized under `apps/frontend/mock-data/`. Browser protocol files/dependencies and Envoy were removed; native backend gRPC is retained, with Buf tooling moved to the root npm package. Auth/REST integration is next, not part of this change. See [frontend cleanup](implementation-plan/T05-remove-frontend-grpc.md).

> **Deploying this:** rebuild the frontend image. Remove the old `grpc-proxy` service/container when updating an existing stack; `MOCK`, `CONTROLLER_BASE_URL`, `GRPC_PROXY_PORT`, and `CORS_ALLOWED_ORIGINS` are obsolete frontend/proxy settings. Keep backend `CONTROLLER_MODE` and `CONTROLLER_GRPC_URL`. This intermediate frontend is for development review; authentication is not yet connected.

## 2026-11-04

### Change — SSO role from the `groups` claim

The role of an SSO user now comes from the token's `groups` claim:
`surimi-admins` → admin, `surimi-members` → member. The local Keycloak realm
sends it. [features/auth-and-users](features/auth-and-users/README.md).

> **Deploying this:** the Keycloak client needs a Group Membership mapper
> (claim `groups`, *Full group path* off, in the ID token). To keep client
> roles instead, set `OIDC_KEYCLOAK_ROLE_CLAIM`, `OIDC_KEYCLOAK_ADMIN_VALUES`
> and `OIDC_KEYCLOAK_MEMBER_VALUES`.

### Change — SSO and local users are separate; first and last name

An SSO sign-in no longer takes over a local account with the same e-mail.
Every user has a unique, verified e-mail: a first SSO sign-in whose e-mail
is missing, unverified or already used is refused with a clear message. An
SSO user's e-mail and names follow the provider at every sign-in. Users now
have first name, last name and display name; first and last name are
required when an admin creates a user.
[ADR 0016](decisions/0016-separate-sso-and-local-accounts.md),
[features/auth-and-users](features/auth-and-users/README.md).

> **Deploying this:** migration `0003_user_names`. Add `ADMIN_FIRST_NAME`
> and `ADMIN_LAST_NAME` next to the other `ADMIN_*` settings: a partly set
> group now stops the `migrate` job. `POST /api/v1/admin/users` requires
> `first_name` and `last_name`.

---

## 2026-11-03

### Feature — Sign-in, users and admin user management (API)

The API now has users. They sign in with a local password or through SSO
(OpenID Connect; Keycloak first, any OIDC provider by configuration). Roles
are `admin` and `member`; an SSO user's role is read from the provider at
every sign-in, and losing it there ends their sessions. Admins create, change,
deactivate and reset users through `/api/v1/admin/users`. Every sign-in is
recorded, with IP and user agent kept 90 days each (configurable). A local
Keycloak with test users comes with compose (`--profile keycloak`). No web
page yet: the frontend gets its sign-in in phase 10; use Bruno
(`api/auth/post token`) or `/api/v1/docs`.
[features/auth-and-users](features/auth-and-users/README.md).

> **Deploying this:** migration `0002_auth`. Every API route except
> `/healthz`, `/readyz` and sign-in now needs a signed-in user. New settings:
> `JWT_SECRET` (required, at least 32 characters), `PUBLIC_BASE_URL`,
> `COOKIE_SECURE`, `ADMIN_EMAIL`, `ADMIN_USERNAME`, `ADMIN_PASSWORD` (compose
> creates that admin on every start), `RETENTION_LOGIN_IP_DAYS`,
> `RETENTION_LOGIN_USER_AGENT_DAYS`, and for SSO `OIDC_PROVIDERS` and
> `OIDC_<K>_*` with the redirect URI
> `<PUBLIC_BASE_URL>/api/v1/auth/sso/<K>/callback` registered at the provider.
> See `deployments/.env.example`.

### Feature — Backend skeleton: API, PostgreSQL, controller client

A FastAPI backend in `apps/backend` with health checks, the first endpoints
(`GET /api/v1/scenarios`, `GET /api/v1/scenarios/{name}/contract`, cached), a
native gRPC client for the controller and a built-in fake for when none is
reachable. PostgreSQL ships with the stack and is created and migrated
automatically. nginx serves the API under `/api/v1/`. No frontend change.
Details: [features/backend-skeleton](features/backend-skeleton/CHANGELOG.md).

> **Deploying this:** `docker compose -f deployments/compose.yml up --build -d`
> now also starts `postgres`, `db-bootstrap`, `migrate` and `api`, in that
> order. The API uses the fake controller by default (`CONTROLLER_MODE=fake`);
> set `CONTROLLER_MODE=grpc` and `CONTROLLER_GRPC_URL` for a real one. Set
> `POSTGRES_PASSWORD` and `DB_PASSWORD` in `deployments/.env` anywhere shared.

### Feature — Monorepo layout: frontend in `apps/frontend`, deployment files in `deployments/`

The repository is now an npm workspace, ready for the backend (phase 2 of the
[plan](plans/2026-11-03-monorepo-and-backend.md)). The app itself does not
change. CI builds the frontend and its image on every pull request. Details:
[features/monorepo-restructure](features/monorepo-restructure/CHANGELOG.md).

> **Deploying this:** compose now lives in `deployments/`: run
> `docker compose -f deployments/compose.yml up --build -d`, or the unchanged
> `npm run docker:up`. Container names stay `surimi-modelgui-*`. A local `.env`
> splits in two: compose settings go to `deployments/.env`, Vite settings for
> `npm run dev` to `apps/frontend/.env`.
