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

## 2026-11-17

### Change — Outputs folder under `deployments/mounts/experiments`

The local outputs folder the containers mount (`OUTPUTS_LOCAL_DIR`) now
defaults to `deployments/mounts/experiments` (git-ignored) instead of
`output_folder/experiments`. The develop deploy never touches it.

> **Deploying this:** to keep reading the local copies in `output_folder/`,
> set `OUTPUTS_LOCAL_DIR=../output_folder/experiments`. With S3 outputs
> nothing changes.

### Feature — Automatic deployment of `develop`

A push to `develop` whose checks pass is deployed to the develop server by
its self-hosted GitHub runner: only the images whose sources changed are
built there (`ghcr.io/surimi-project/surimi-modelgui-backend-api:develop`,
`ghcr.io/surimi-project/surimi-modelgui-web:develop`, plus a commit tag for
rollback; not pushed), only the deployment files that differ are copied to
`$DEPLOY_PATH/deployments`, and only the services whose image or mounted files
changed are restarted. Every container's logs rotate at 5 × 10 MB; old images
and build cache are pruned. `deployments/compose.yml` now runs images by name
and tag (`BACKEND_IMAGE`, `BACKEND_TAG`, `WEB_IMAGE`, `WEB_TAG`);
`deployments/compose.local.yml` builds them from source. See
[develop-deployment](features/develop-deployment/README.md), ADR 0026.

> **Deploying this:** locally use `docker compose -f deployments/compose.local.yml
> up --build -d` (`npm run docker:up`); the images are now the same names
> with tag `:local`. Server
> setup: [develop-deployment § Server setup](features/develop-deployment/README.md#server-setup-once).

### Change — The browser no longer reaches the controller (Envoy removed)

The gRPC-Web proxy (Envoy, compose profile `grpc-proxy`) and nginx's
`/api/controller/` route are removed; nginx answers that path with `410`. Only
the backend calls the controller. The current frontend is built with
`MOCK=true` by default and shows canned scenarios and run statuses until phase
10 moves it onto the backend API. Bruno's `grpc-proxy/` folder is now
`controller/` (variable `urlController`), calling the controller directly.
See [monorepo-restructure](features/monorepo-restructure/CHANGELOG.md).

> **Deploying this:** rebuild the web image; remove an old `grpc-proxy`
> container with `docker compose -f deployments/compose.yml up -d --remove-orphans`.
> `GRPC_PROXY_PORT`, `CONTROLLER_BASE_URL` and `CORS_ALLOWED_ORIGINS` are no
> longer read.

### Fix — SSO sign-in started on another host name

Signing in with SSO from the console opened at an address other than
`PUBLIC_BASE_URL` (for example `127.0.0.1` instead of `localhost`) failed with
`sso_failed`, "the sign-in state is missing". The login now moves to
`PUBLIC_BASE_URL` before it sets its cookie. See
[auth-and-users](features/auth-and-users/CHANGELOG.md).

> **Deploying this:** rebuild the API image. Proxies in front of the API must
> pass the original `Host` header (nginx does: `proxy_set_header Host $host`).

### Change — Mounted configuration under `deployments/mounts/`

The files compose mounts into containers moved to
`deployments/mounts/<service>/` (`postgres/`, `keycloak/`, `envoy/`,
`observability/`), so everything a running container reads from the host is in
one place. `deployments/nginx/` stays: the web image copies it at build time.
See [monorepo-restructure](features/monorepo-restructure/CHANGELOG.md).

> **Deploying this:** nothing; the next `docker compose up` uses the new
> paths. Data volumes are unchanged.

### Feature — Metrics, traces, activity statistics and retention (phase 7)

- **Metrics.** The API serves Prometheus metrics at `/metrics` (outside
  `/api/v1/`, not forwarded by nginx), and the worker on port 9102: requests by
  route, sign-ins, experiments submitted and ended, controller call times,
  experiments by state, pods in use, stalled runs, worker cycles. Several API
  processes share their numbers. `METRICS_ENABLED=false` turns it off;
  `METRICS_TOKEN` makes both answer only `Authorization: Bearer <token>`.
- **Traces.** OpenTelemetry over OTLP/HTTP when `OTEL_EXPORTER_OTLP_ENDPOINT`
  is set: requests, SQL, controller calls and worker cycles. Log lines inside a
  span carry `trace_id` and `span_id`.
- **Admin statistics and audit log.** `GET /api/v1/admin/stats`,
  `/admin/stats/users`, `/admin/users/{id}/activity`, `/admin/audit-events`:
  sign-ins, last sign-in, experiments submitted, completed, failed and
  cancelled, per user and in total, for any period.
- **Retention (ADR 0013).** The worker leader purges once a day: sign-ins
  older than 13 months are rolled up by month, IPs and user agents nulled after
  90 days, audit events deleted after 24 months, ended sessions after 30 days,
  soft-deleted experiments after 12 months.
- **Local dashboards.** Compose profile `observability`: Prometheus
  (127.0.0.1:18090), Grafana with a starter dashboard (18091), Jaeger (18092).
  Container logs rotate at 5 × 10 MB.

See [features/observability-and-activity](features/observability-and-activity/README.md).
ADR 0010 accepted.

> **Deploying this:** no migration. New settings, all optional, in
> `deployments/.env.example`: `METRICS_ENABLED`, `WORKER_METRICS_PORT`,
> `METRICS_TOKEN`, `PROMETHEUS_MULTIPROC_DIR`, `OTEL_EXPORTER_OTLP_ENDPOINT` (and the standard
> `OTEL_*`), `RETENTION_PURGE_INTERVAL_HOURS`, `RETENTION_LOGIN_EVENTS_DAYS`,
> `RETENTION_AUDIT_DAYS`, `RETENTION_SESSIONS_DAYS`,
> `RETENTION_DELETED_EXPERIMENTS_DAYS`. The purge starts when the new worker
> first leads; set a period to 0 to keep those rows. Keep `/metrics` off any
> public ingress, and set `METRICS_TOKEN` (given to the scraper too) wherever
> the API port is reachable from outside.

---

## 2026-11-16

### Feature — Several API processes (`WEB_CONCURRENCY`)

`surimi-backend serve` starts `WEB_CONCURRENCY` uvicorn processes (default 1,
1 to 32). Each opens its own database pool, so keep `WEB_CONCURRENCY` × 20
under PostgreSQL's `max_connections`. See
[features/backend-skeleton](features/backend-skeleton/README.md#processes).

> **Deploying this:** rebuild the backend image. Nothing changes until
> `WEB_CONCURRENCY` is set.

### Docs — Checked against the code and the database; console end date one year

The docs were checked against the API routes, the settings, the files and the
live database, and corrected where they had drifted (setting names, file
lists, the schema doc, the data model diagram, the feature index); see
[features/backend-skeleton](features/backend-skeleton/CHANGELOG.md). The
console's New experiment form now proposes an end date one year after the
scenario's start instead of the contract's maximum.

> **Deploying this:** rebuild the backend image (the console).

### Fix — Console: HCRs typed into the experiment form were not sent

In the New experiment tab, values typed for a species were dropped unless its
**Apply** box was ticked, so an experiment could be submitted with no rules
(`"harvest_control_rules": []`). The form now has an **Add a species**
dropdown and a list of the species added: every row of the list is sent, an
incomplete row stops the submit, and the confirmation names the rules sent.
See [features/backend-console](features/backend-console/CHANGELOG.md).

> **Deploying this:** rebuild the backend image.

### Change — Download links last 1 hour; download from the console

A presigned download link to an experiment's `.nc` now works for 1 hour
(`PRESIGNED_URL_TTL_SECONDS`, default 3600, was 900; 60 s to 7 days
accepted). The console's **My experiments** has a **Download .nc** button for
completed runs. See [features/experiment-outputs](features/experiment-outputs/CHANGELOG.md).

> **Deploying this:** rebuild the backend image. Set
> `PRESIGNED_URL_TTL_SECONDS` only to change the 1 hour.

### Change — Unreleased migrations rebuilt, one per feature

The migrations after `0003_user_names`, none released, are now one per
feature, each creating its final tables: `0004_experiment_runs`,
`0005_experiment_outputs`, `0006_species_catalog`, `0007_hcr_configurations`.
The schema they build is identical to before. See
[features/backend-skeleton](features/backend-skeleton/CHANGELOG.md).

> **Deploying this:** a database at `0007_hcr_configurations` needs nothing.
> One at `0004_experiments_hcr_kg`, `0005_species` or `0006_hcr_owner_required`
> stops with "Can't locate revision": either bring it to the old head with the
> previous build's `surimi-backend migrate` (keeps the data), or recreate it
> (drop the tables after 0003 and set `alembic_version` to `0003_user_names`,
> or recreate the database), then run the migrate job.

### Feature — Several HCR configurations per scenario

Each user can keep several named harvest control rule configurations per
scenario (at most 50), at `/api/v1/scenarios/{name}/hcr-configurations`, and
submit an experiment with one (`hcr_configuration_id`) or with rules as given.
The rules of a configuration are stored as a `jsonb` array. The experiment
options now list every species of the contract, each saying whether it can
carry an HCR, and the user's configurations. The console's New experiment tab
loads, saves, saves as new and deletes configurations. `/api/v1/scenarios/{name}/hcr`
is removed. See
[ADR 0025](decisions/0025-several-named-hcr-configurations-per-scenario-in-jsonb.md)
and [features/harvest-control-rules](features/harvest-control-rules/CHANGELOG.md).

> **Deploying this:** rebuild the images, then run the migrate job (migration
> `0007_hcr_configurations`; see the rebuilt migrations above for a database
> part-way through the old chain).

### Docs — No names of persons

The docs, the skills, the Bruno request docs and a few code comments no
longer name persons: partners appear as their team (controller team, Ecopath
team, MICE team, the project), author lines read "written with Claude", and
personal EDITO namespaces appear as `user-<developer>`, `oidc-<developer>` and
`user-<controller-team>`. The real namespace names stay where they are needed
to connect: the Bruno environments, `apps/frontend/package.json` and
`deployments/.env`.

> **Deploying this:** nothing.

### Change — Harvest control rules are only each user's own

There are no scenario default HCRs any more: admins do not maintain HCR
values, and the reference values come from the controller (initial biomass
and fishing mortality). Each user saves their own biomass limits, biomass
bases and fishing mortalities per scenario, as a whole set with
`PUT /api/v1/scenarios/{name}/hcr` or **Save as my rules** in the console's
New experiment tab. Removed: `/api/v1/admin/scenarios/{name}/hcr-defaults`,
`POST /api/v1/scenarios/{name}/hcr/reset`, `surimi-backend seed-hcr`, and
`source` / `rules_source` in the HCR list and the experiment options. See
[ADR 0024](decisions/0024-harvest-control-rules-only-per-user-no-defaults.md)
and [features/harvest-control-rules](features/harvest-control-rules/CHANGELOG.md).

> **Deploying this:** rebuild the images, then run the migrate job
> (`surimi-backend migrate`, migration `0006_hcr_owner_required`). It deletes
> the default rules for good. The migrate job no longer runs `seed-hcr`; drop
> it from any other deployment script that calls it.

### Feature — Configure and submit experiments from the console

`GET /api/v1/scenarios/{name}/experiment-options` returns, in one call,
everything an experiment form needs for a scenario: the contract's dates and
climate scenarios, the pods a run takes, and for each species that can carry
a harvest control rule its names, group, the user's saved rule and the
controller's initial biomass and fishing mortality. The backend console's new
**New experiment** tab uses it to configure and submit an experiment (HCRs in
tonnes and per year) and lists the user's experiments with a cancel button.
The console is now in tabs. See
[features/experiments](features/experiments/CHANGELOG.md).

> **Deploying this:** rebuild the backend image. No migration.

### Feature — Species import, export and browsing

Admins can export the species table as CSV and import a CSV back, mapping its
columns onto the table's (an ASFIS file needs no mapping), either **upsert**
(add and update, delete nothing) or **replace** (the file becomes the table;
codes still in use cannot be deleted). Every import is checked first (dry
run), applied all or nothing, and audited. `GET /api/v1/species` can be sorted
by code, name or scientific name. The backend console gains a species browser
and, for admins, the import and export screen. See
[features/scenario-catalog](features/scenario-catalog/CHANGELOG.md).

> **Deploying this:** rebuild the backend and web images (nginx now allows
> 10 MB for `/api/v1/admin/species/import` only). Optional
> `CATALOG_IMPORT_MAX_MB` (10). `seed-species` now only adds missing codes;
> load a newer shipped list with an admin import or
> `surimi-backend seed-species --update`.

### Feature — Species names and higher taxa from the database

The backend now keeps every species of the FAO ASFIS list (13,567, plus
manual rows for codes it lacks) in a `species` table, with English and
scientific name, family, order or higher taxa and ISSCAAP group.
`GET /api/v1/species` serves them a page at a time, with a word search and
filters by ISSCAAP group, family and order, all index-backed;
`GET /api/v1/species/{code}` serves one. The scenario catalog adds `family`
and `order_or_higher_taxa` to each species. The data ships as
`catalog/data/species.csv`, written by `scripts/build_species_csv.py`. See
[features/scenario-catalog](features/scenario-catalog/CHANGELOG.md) and
[ADR 0023](decisions/0023-scenario-catalog-in-the-database-from-an-admin-workbook.md).

> **Deploying this:** run the `migrate` job (migration `0005_species`, then
> `surimi-backend seed-species` before `seed-hcr`, which loads the 13,570
> rows) before the new `api` starts.

---

## 2026-11-13

### Feature — Startup log shows the URLs and every setting

When the API starts, `app.started` now lists the Swagger UI, OpenAPI and
console URLs and whether SSO is on, and a new `app.config` line lists every
setting by area, with each SSO provider's callback URL; secrets appear only as
`set` or `not set`. The worker logs the same as `worker.config`. See
[features/backend-skeleton](features/backend-skeleton/CHANGELOG.md).

> **Deploying this:** nothing to do. Log pipelines that parse `app.started`
> get new fields.

### Change — Harvest control rule biomass in kg; migrations 0004 to 0006 rebuilt

Harvest control rules now carry biomass in **kilograms** in the API, the
database and each experiment's stored request: `biomass_limit_kg` and
`biomass_base_kg` replace `biomass_limit_t` and `biomass_base_t` (at most
3.3e12). The controller takes kg, so the backend no longer converts; the
phase 10 UI will show tonnes. The seed still reads the partners' tonnes CSV.
See [ADR 0022](decisions/0022-hcr-biomass-in-kg-tonnes-only-in-the-ui.md) and
[features/harvest-control-rules](features/harvest-control-rules/CHANGELOG.md).

The unreleased migrations `0004_experiments`, `0005_results_and_hcr_bounds`
and `0006_initialised` are replaced by one, `0004_experiments_hcr_kg`, with
the same end state apart from the kg columns. The deploy notes below that
name the old migrations now mean this one.

> **Deploying this:** a database that ran the old migrations stops with
> "Can't locate revision". Recreate it, or keep its users and sign-ins by
> removing what migration 0004 onward created, then run the `migrate` job
> (it also runs `seed-hcr`):
>
> ```sql
> DROP TABLE simulations, experiment_outputs, experiment_events,
>   harvest_control_rules, experiments, app_settings;
> DROP TYPE experiment_status, simulation_status, output_state;
> UPDATE alembic_version SET version_num = '0003_user_names';
> ```
>
> Experiments, saved rules and app settings are lost. API clients send
> `biomass_limit_kg` and `biomass_base_kg` (tonnes × 1000).

### Feature — Status `initialised` and each simulation of a run

An experiment now shows `initialised` when all its simulations are initialised
and wait for the controller to start them together; it stays `initialising`
while any one is not. Every experiment response has `simulation_counts` (for
example 3 initialising, 2 initialised for an MSE run), each simulation has its
own `progress`, and each simulation's change is a `simulation.status_changed`
event. See
[simulation-status-scheduler](features/simulation-status-scheduler/README.md#experiment-state-from-its-simulations).

> **Deploying this:** run the `migrate` job (migration `0006_initialised`,
> since 2026-11-13 part of `0004_experiments_hcr_kg`, see above)
> before starting the new API and worker.

---

## 2026-11-12

### Feature — Experiment statuses `copying_results` and `completed`

A run the controller reports `Finished` is now `copying_results` until its
`.nc` is in the bucket and indexed, then `completed`; `failed` if the file does
not arrive within `OUTPUT_WAIT_MINUTES` (60) or cannot be read. `finished` no
longer exists as a status. New field `completed_at`; `finished_at` is when the
run ended. A `copying_results` run cannot be cancelled and holds no Ecopath
pod. See [features/simulation-status-scheduler](features/simulation-status-scheduler/README.md#results-copying_results--completed).

### Feature — Presigned download link as JSON

`GET /api/v1/experiments/{id}/outputs/download-url?file=nc` returns the
presigned S3 link with its expiry, for pages and scripts that need the link
itself. See [features/experiment-outputs](features/experiment-outputs/README.md#downloads).

### Feature — Initial biomass and fishing mortality per scenario

`GET /api/v1/scenarios/{name}/initial-biomasses` and
`/initial-fishing-mortalities` ask the controller (new RPCs, SURIMI-protocol
`250f617`) on every request. Only `northwestern_med` has them today. See
[features/scenario-catalog](features/scenario-catalog/README.md#initial-biomass-and-fishing-mortality).

### Change — Notifications are polled, not streamed

`GET /api/v1/events` now answers JSON for polling (`?after=<last_id>`) instead
of a Server-Sent Events stream ([ADR 0021](decisions/0021-notifications-by-polling.md)).
No client used the stream yet.

### Change — Harvest control rules follow the controller's bounds

Biomass limit and base at most 3.3e9 t and `f_max` at most 100 are now refused
with 422 when a rule is saved or an experiment submitted, instead of failing
at the controller. See [features/harvest-control-rules](features/harvest-control-rules/README.md).

> **Deploying this:** run the `migrate` job (migration
> `0005_results_and_hcr_bounds`, since 2026-11-13 part of
> `0004_experiments_hcr_kg`) before the new `api` and `worker` start. It
> renames `finished` to `completed` and moves existing runs to `completed`,
> `copying_results` or `failed` by the state of their outputs; it fails if a
> saved harvest control rule is outside the new bounds. Remove
> `SSE_HEARTBEAT_SECONDS`, `SSE_REPLAY_MAX_EVENTS` and `SSE_REPLAY_MAX_HOURS`
> from the environment if they were set: the settings are gone. The controller
> must run SURIMI-controller `117e604` or later for the two initial-state
> endpoints (true on `project-surimi` on 2026-11-12).

---

## 2026-11-06

### Feature — Harvest control rules, experiments, queue, worker, notifications, outputs (phases 4 to 6)

The backend now runs experiments end to end. Users keep harvest control rules
per scenario in tonnes ([features/harvest-control-rules](features/harvest-control-rules/README.md)),
submit experiments that are checked against the scenario catalog and contract
and queued ([features/experiments](features/experiments/README.md)), and a new
worker sends them to the controller only when enough Ecopath pods are free
([features/experiment-queue](features/experiment-queue/README.md)), follows them
([features/simulation-status-scheduler](features/simulation-status-scheduler/README.md)),
and indexes finished runs' outputs so charts, maps and downloads are served
from the file in S3 or a local folder
([features/experiment-outputs](features/experiment-outputs/README.md)).
Changes stream to browsers over `GET /api/v1/events`
([features/notifications](features/notifications/README.md)).

Why the queue matters now: the controller drops a run silently when no pod is
free ("No available pods" only in its log) and never frees the pods of
`Error` runs. On 2026-11-06 all 5 pods of `user-<developer>` were held that
way. The queue counts those pods and waits; a run that still never starts is
failed with that reason.

Decisions: [ADR 0019](decisions/0019-worker-row-driven-with-advisory-lock.md)
(worker without Procrastinate) and [ADR 0020](decisions/0020-own-chunk-index-built-with-h5py.md)
(chunk index without kerchunk).

> **Deploying this:** migration `0004_experiments` (since 2026-11-13
> `0004_experiments_hcr_kg`; the migrate job runs it,
> then `seed-hcr`). New compose service `worker`. Set `ECOPATH_PODS` and
> `CONTROLLER_MSE_SIMULATIONS` to the controller's values, and `OUTPUTS_URI`
> plus `S3_*` for a bucket. New dependencies: numpy, h5py, s3fs.

### Feature — Backend console

The API now serves a sign-in and home page at `/api/v1/console/`
(<http://localhost:18080/api/v1/console/> in compose). It offers password and
SSO sign-in, a forced password change for temporary passwords, the signed-in
account, the controller's scenarios and, for admins, the user list. It lets
the backend be tried in a browser before the phase 10 frontend exists. It only
calls the public API and is not the frontend.
[features/backend-console](features/backend-console/README.md).

> **Deploying this:** nothing; the page ships in the API image. Set
> `CONSOLE_ENABLED=false` to turn it off.

---

## 2026-11-05

### Feature — Scenario catalog

`GET /api/v1/scenarios/{name}/catalog` says what each scenario contains:
functional groups with the names from the EwE models, species with English
names, which species can carry a harvest control rule, climate scenarios, and
whether outputs make sense per functional group, per species or both
(`northwestern_med` both, `anchovy_bay` functional groups only, `aegean_sea`
species only until its MICE groups are published). With
`CONTROLLER_MODE=fake` the contracts are now copies of the real ones.
[features/scenario-catalog](features/scenario-catalog/README.md).

> **Deploying this:** nothing; the catalog files ship in the image.

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
