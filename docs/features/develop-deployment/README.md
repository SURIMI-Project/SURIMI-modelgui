# Develop deployment

**Status:** Built 2026-11-17 on `develop`; tested locally against a scratch deploy folder, not run on the server yet
**Plan:** before phase 9 (EDITO); asked by the user 2026-11-17
**ADRs:** [0026](../../decisions/0026-develop-deployment-self-hosted-runner-compose.md), [0013](../../decisions/0013-data-retention.md)

Every push to `develop` whose tests pass is deployed to the develop server by
the self-hosted GitHub runner on it: only the images whose sources changed are
built, only the deployment files that differ are copied, and only the services
whose image or mounted files changed are restarted.

| File | Purpose |
| --- | --- |
| [README.md](README.md) | Design, decisions, server setup |
| [CHANGELOG.md](CHANGELOG.md) | Dated log of every change |

---

## Decisions

| Decision | Why | Recorded in |
| --- | --- | --- |
| Images built on the server, no registry | One host, the runner on it; a registry adds only a push and a pull | [ADR 0026](../../decisions/0026-develop-deployment-self-hosted-runner-compose.md) |
| Two standalone files: `compose.yml` runs images (`BACKEND_IMAGE`, `BACKEND_TAG`, `WEB_IMAGE`, `WEB_TAG`), `compose.local.yml` builds them; otherwise identical, checked in CI | Either runs with one `-f` (user, 2026-11-17); the check stops drift | [ADR 0026](../../decisions/0026-develop-deployment-self-hosted-runner-compose.md) |
| Images `ghcr.io/surimi-project/surimi-modelgui-backend-api` and `ghcr.io/surimi-project/surimi-modelgui-web`; the server runs `:develop`, each build also tagged `:<commit>`; `compose.local.yml` builds `:local` (user, 2026-11-17) | GitHub-style names; `:develop` says what the server runs, commit tags keep a rollback target | [ADR 0026](../../decisions/0026-develop-deployment-self-hosted-runner-compose.md) |
| Built with `docker build --provenance=false --sbom=false` | The attestations carry a timestamp: two builds of the same sources got two ids, so every build would roll | [ADR 0026](../../decisions/0026-develop-deployment-self-hosted-runner-compose.md) |
| Changes = diff with the last *deployed* commit | A failed deploy's changes are deployed by the next run | [ADR 0026](../../decisions/0026-develop-deployment-self-hosted-runner-compose.md) |
| Roll a service only when its `:develop` image id changed, or when its container does not run that image | A rebuild that changed nothing restarts nothing; a hand-changed or half-deployed container is put right | [ADR 0026](../../decisions/0026-develop-deployment-self-hosted-runner-compose.md) |
| Deploy job inside `ci.yml`, after the test jobs | Broken code is not deployed; `workflow_run` only fires from the default branch | [ADR 0026](../../decisions/0026-develop-deployment-self-hosted-runner-compose.md) |
| CI never writes the server's `.env` except `BACKEND_TAG` / `WEB_TAG` (kept at `develop`, with a comment naming the commit) | It holds the secrets | this file |
| Files under `DEPLOY_PATH` owned by `DEPLOY_OWNER` (`deployer:deployer`); `sudo -n` only for what the runner user cannot do | The runner may run with sudo (user, 2026-11-17); the stack's files stay with the deployer | this file |
| Mounted files synced in place (copy over, delete extras), then the service using them recreated | A single-file bind mount keeps its inode; the recreate picks up directories | this file |
| Outputs in `mounts/experiments/`, a runtime data folder the sync never copies, deletes or chowns into | Everything mounted lives under `mounts/` (user, 2026-11-17); the sync would otherwise delete data that is not in the repo | [ADR 0001](../../decisions/0001-monorepo-layout-and-tooling.md), this file |
| Logs `json-file` 5 × 10 MB on every service; 5 commit tags per image; 7 days of build cache | The disk does not fill: logs, old images and build cache are the three that grow | [ADR 0013](../../decisions/0013-data-retention.md), this file |

---

## What changes what

| Changed path (since the deployed commit) | Image built | Services rolled |
| --- | --- | --- |
| `apps/backend/`, `packages/proto/`, `pyproject.toml`, `uv.lock`, `.python-version`, `.dockerignore` | backend | `migrate`, `api`, `worker` (only if the image id changed) |
| `apps/frontend/`, `package.json`, `package-lock.json`, `deployments/nginx/`, `.dockerignore`, `.nvmrc` | web | `web` (only if the image id changed) |
| `deployments/compose.yml` (content differs on the server) | — | the whole stack reconciled: compose recreates only containers whose config differs |
| `deployments/mounts/postgres/` | — | `db-bootstrap` (re-run) |
| `deployments/mounts/keycloak/` | — | `keycloak`, if running |
| `deployments/mounts/observability/prometheus/` | — | `prometheus`, if running |
| `deployments/mounts/observability/grafana/` | — | `grafana`, if running |
| `deployments/mounts/experiments/` (outputs, data) | — | never synced: not in git; on the server it is created once and left alone |
| anything else (docs, tests only, Bruno) | — | nothing |

An image is also built when its `:develop` is missing on the server (first
deploy, or pruned). "Redeploy everything" (manual run) builds both images and
reconciles the whole stack.

The API's nginx resolves the API per request, so a recreated `api` needs no
`web` restart.

---

## Flow

```mermaid
sequenceDiagram
    participant G as GitHub (push to develop)
    participant T as Test jobs (GitHub-hosted)
    participant R as Self-hosted runner (develop server)
    participant D as Docker on the server
    participant F as $DEPLOY_PATH/deployments
    G->>T: ci.yml: frontend, backend, stubs
    T-->>R: deploy-develop starts when none failed
    R->>F: read .deployed-commit, .env (BACKEND_TAG, WEB_TAG, image names)
    R->>R: git diff deployed..HEAD → backend? web?
    R->>D: docker build -t :develop -t :<commit> (no attestations)
    D-->>R: image id; differs from the :develop before?
    R->>F: BACKEND_TAG / WEB_TAG = develop, comment naming the commit
    R->>F: copy compose.yml, .env.example, mounts/ where content differs
    R->>D: compose up -d <changed services> (or the whole stack)
    R->>D: wait for api healthy
    R->>F: write .deployed-commit
    R->>D: prune: 5 tags per image, dangling images, build cache > 7 days
```

---

## Server setup (once)

1. Docker with Compose v2 and git are installed; the runner has the labels
   `self-hosted`, `Linux`, `X64` (the job's `runs-on`). The runner user is in the `docker` group, or has
   passwordless sudo (`sudo -n docker`, `mkdir`, `cp`, `chown`, …): the script
   uses sudo only for what it cannot do itself. The user `deployer`
   (group `deployer`) exists; it owns what the script writes.
2. GitHub: environment `develop` with the variable `DEPLOY_PATH`.
3. First run: it creates `$DEPLOY_PATH/deployments`, copies `.env.example`
   there, and stops. Create `.env` from it (owned by `deployer`, mode 600) with real secrets (`JWT_SECRET`,
   `DB_PASSWORD`, `POSTGRES_PASSWORD`, `METRICS_TOKEN`, OIDC, S3),
   `COMPOSE_PROJECT_NAME=surimi-modelgui-develop`, `PUBLIC_BASE_URL`,
   `COOKIE_SECURE=true` behind https, and `COMPOSE_PROFILES` (for example
   `observability`); then re-run the job.
4. Optional, for containers started outside compose: a default log rotation in
   `/etc/docker/daemon.json`:
   `{"log-driver": "json-file", "log-opts": {"max-size": "10m", "max-file": "5"}}`
   and restart Docker.

## TLS in front: the server's nginx

The develop server's own nginx terminates TLS for
`modelgui-dev.surimi.konnecta.io` and proxies to the stack's `web` container,
which listens on `127.0.0.1` only. In the server's `.env` (the develop server
uses 18081 for web and 18082 for the API):

```
SURIMI_PORT=127.0.0.1:18081
API_PORT=18082
PUBLIC_BASE_URL=https://modelgui-dev.surimi.konnecta.io
COOKIE_SECURE=true
```

`/etc/nginx/sites-available/modelgui-dev.surimi.konnecta.io`, linked into
`sites-enabled`:

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name modelgui-dev.surimi.konnecta.io;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    listen [::]:443 ssl;
    server_name modelgui-dev.surimi.konnecta.io;

    # Must cover modelgui-dev.surimi.konnecta.io (a *.surimi.konnecta.io
    # wildcard, or that name in the certificate).
    ssl_certificate /etc/letsencrypt/live/surimi.konnecta.io/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/surimi.konnecta.io/privkey.pem;

    client_max_body_size 50m;

    location / {
        # The web container (SURIMI_PORT); it forwards /api/v1/ to the API itself.
        proxy_pass http://127.0.0.1:18081;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        # Output downloads and long chart requests stream through.
        proxy_buffering off;
        proxy_read_timeout 300s;
    }
}
```

The stack's nginx passes `Host` and the incoming `X-Forwarded-Proto` on to the
API (2026-11-17), so the API sees `https://modelgui-dev.surimi.konnecta.io`:
the SSO host check matches `PUBLIC_BASE_URL`, and redirects stay on https. The
SSO client in Keycloak needs the redirect URI
`https://modelgui-dev.surimi.konnecta.io/api/v1/auth/sso/keycloak/callback`.
The app uses no WebSockets, so no `Upgrade` headers are needed.

The backend needs nothing more: the stack's nginx routes `/api/v1/` to the
API, so `https://modelgui-dev.surimi.konnecta.io/api/v1/` is the API (docs at
`/api/v1/docs`, console at `/api/v1/console/`), on the same origin as the app
(cookies without CORS, ADR 0006). The API's own port (`API_PORT`, 18082) is
published on `127.0.0.1` only, for Bruno or curl on the server: it is not in the
host nginx, which would bypass the web container's `/protected-outputs/`
downloads and its 10 MB import limit. `/metrics` and `/healthz` are not
forwarded.
Bruno: environment `develop`.

---

## Configuration

| Variable | Where | Default | Meaning |
| --- | --- | --- | --- |
| `DEPLOY_PATH` | GitHub environment `develop` | — | Folder on the server; the stack lives in `$DEPLOY_PATH/deployments` |
| `DEPLOY_OWNER` | GitHub environment, optional | `deployer:deployer` | Owner of everything the script writes under `DEPLOY_PATH` |
| `BACKEND_IMAGE`, `BACKEND_TAG` | `.env` | `ghcr.io/surimi-project/surimi-modelgui-backend-api`, `develop` | Image of api, worker and migrate in `compose.yml` (`compose.local.yml` builds `:local`); a commit tag to roll back |
| `WEB_IMAGE`, `WEB_TAG` | `.env` | `ghcr.io/surimi-project/surimi-modelgui-web`, `develop` | Image of web in `compose.yml` |
| `DEPLOY_TAG` | GitHub environment, optional | `develop` | The tag the deploy builds and runs |
| `COMPOSE_PROFILES` | `.env` | empty | Profiles the server runs, e.g. `observability` |
| `DEPLOY_KEEP_IMAGES` | GitHub environment, optional | `5` | Commit tags kept per image |

---

## How to test

- The script runs locally against a scratch folder (`DEPLOY_PATH=/tmp/x
  .github/scripts/deploy.sh`, Git Bash or Linux) with the fake controller and
  its own `COMPOSE_PROJECT_NAME`, image names and ports in that folder's `.env`.
- `python .github/scripts/check-compose-files.py`: the two compose files in step.
- On the server: push a docs-only change (nothing rolls), a backend change
  (`migrate`, `api`, `worker` roll), a `prometheus.yml` change (only
  `prometheus` restarts).

## What has been verified

See [CHANGELOG.md](CHANGELOG.md).

## Open questions

- Which profiles should the develop server run (`observability`?) and behind
  which address and TLS? (User)
