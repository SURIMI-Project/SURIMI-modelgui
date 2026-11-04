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
