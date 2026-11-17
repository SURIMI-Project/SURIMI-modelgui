# 0026 — Deploy `develop` with a self-hosted runner: build changed images on the host as `:develop`, roll only what changed

**Status:** Proposed
**Date:** 2026-11-17
**Related:** [features/develop-deployment](../features/develop-deployment/README.md), [0001](0001-monorepo-layout-and-tooling.md), [0013](0013-data-retention.md)

## Context

- The user set up a self-hosted GitHub Actions runner on the develop server
  and a GitHub environment `develop` with the variable
  `DEPLOY_PATH=/opt/surimi-modelgui-develop` (user, 2026-11-17). The runner may
  use sudo; the deployment files belong to `deployer:deployer` (user,
  2026-11-17).
- Wanted (user, 2026-11-17): find what changed on `develop`; build only the
  images that need it; create `$DEPLOY_PATH/deployments` if missing; copy the
  deployment files that changed; restart only the services that changed;
  `compose.yml` with images and tags (tags as env variables) and
  `compose.local.yml` building from source, each usable on its own and
  otherwise the same; GitHub-style image names
  `ghcr.io/surimi-project/surimi-modelgui-backend-api` and
  `ghcr.io/surimi-project/surimi-modelgui-web`, tag `:develop` on the develop
  server; a log retention that does not fill the disk. The runner's labels
  are `self-hosted`, `Linux`, `X64`.
- The sister project BrocoMatuRisk (`.github/workflows/ci-cd.yml`) deploys the
  same way, with images pushed to GHCR, pinned by digest in the server's
  `.env`, and `provenance: false`. **Read from source** 2026-11-17.
- The develop server is one host, and the runner runs on it.
- BuildKit's default provenance attestation carries a timestamp: two builds
  of the same sources got two image ids; without it, the same id. **Verified**
  2026-11-17 (Docker Desktop 29.1).

## Decision

- Two standalone compose files, identical apart from the built services'
  `image` and their `build:` sections:
  - `deployments/compose.yml` runs
    `${BACKEND_IMAGE:-ghcr.io/surimi-project/surimi-modelgui-backend-api}:${BACKEND_TAG:-develop}`
    (migrate, api, worker) and `${WEB_IMAGE:-ghcr.io/surimi-project/surimi-modelgui-web}:${WEB_TAG:-develop}`;
  - `deployments/compose.local.yml` builds the same names with tag `:local`
    from the checkout.
  A CI job (`.github/scripts/check-compose-files.py`) fails when they differ
  anywhere else.
- A `deploy-develop` job in `ci.yml` runs on the self-hosted runner after the
  other jobs pass, for pushes to `develop` (and by hand, with "redeploy
  everything"). It runs `.github/scripts/deploy.sh`:
  1. what changed = `git diff` between the commit last deployed (kept in
     `$DEPLOY_PATH/deployments/.deployed-commit`) and this one;
  2. `docker build` of the backend and/or web image on the host, tagged
     `:develop` (what compose runs) and `:<commit>` (for a rollback), without
     provenance or SBOM attestations;
  3. rolls a service only when its `:develop` image id changed, or when its
     container does not run that image; `BACKEND_TAG` / `WEB_TAG` in the
     server's `.env` stay `develop` (set back after a hand rollback), with a
     comment saying which commit `:develop` is;
  4. copies `compose.yml`, `.env.example` and `mounts/` where their content
     differs, never `.env`;
  5. `docker compose up -d` the services whose image or mounted files changed
     (the whole stack when `compose.yml` changed; compose still recreates only
     the containers whose config differs), waits for the API to be healthy,
     then records the commit;
  6. hands everything it wrote under `DEPLOY_PATH` to `DEPLOY_OWNER`
     (`deployer:deployer`); uses `sudo -n` only for what the runner user
     cannot do itself;
  7. keeps the newest 5 commit tags per image and a week of build cache.
- No registry: images stay in the host's Docker.
- Every service logs with `json-file`, 5 × 10 MB.

## Why

- One host and a runner on it: a registry would only add a push and a pull,
  credentials and storage for the same bytes.
- Diffing against the last *deployed* commit, not the previous push, means a
  change from a failed or cancelled deploy is deployed by the next run.
- `:develop` is the user's choice (2026-11-17): the server always runs the
  newest `develop`, and the name says so. Commit tags next to it keep a
  rollback target, and the comment in `.env` says what runs. Comparing image
  ids, with reproducible builds (no attestation timestamps), keeps a rebuild
  that changed nothing from restarting anything.
- Two standalone files (the user's choice) let anyone run either with one
  `-f`; the CI check removes the drift risk of keeping two copies.
- Deploying from `ci.yml` after the tests means broken code is not deployed.
  A separate `workflow_run` workflow would only fire once it is on the
  default branch (`main`), and `develop` is not merged.
- The server's `.env` holds the secrets: CI never overwrites it, only the two
  tag lines.

## Alternatives considered

| Option | Why not |
| --- | --- |
| Push to GHCR and pull, pinned by digest (as BrocoMatuRisk) | Needed with several hosts; here one host, so only overhead. Phase 9 (EDITO) needs a registry anyway |
| One base file plus an override adding `build:` | No drift, but needs two `-f` to run locally; the user wants each file to run alone |
| Building with `docker compose build` from `compose.local.yml` | Would tag `:local`; `docker build` sets `:develop` and the commit tag directly and needs no compose file |
| Diff against the previous push (`dorny/paths-filter` with `base`) | Misses changes whose deploy failed |
| Commit tags pinned in `.env` (BrocoMatuRisk's way, this ADR's first version) | Exact and reproducible, but the user wants the server to run `:develop`; commit tags are kept anyway, so rollback still works |
| `docker compose up -d --wait` | Fails on the one-shot `migrate` and `db-bootstrap`; the script waits for the API's health check instead |

## Consequences

- Local runs: `docker compose -f deployments/compose.local.yml up --build -d`
  (`npm run docker:up`). A change to one compose file must be made in the other
  too, or CI fails.
- The server needs Docker with Compose v2 and git; the runner user is in the
  `docker` group or has passwordless sudo, and can write `DEPLOY_PATH` or
  `sudo` there. The first deploy stops until `$DEPLOY_PATH/deployments/.env`
  is created from `.env.example` with real secrets.
- Rollback: set `BACKEND_TAG` / `WEB_TAG` in the server's `.env` to an older
  commit tag still on the host (the newest 5 are kept) and `docker compose up
  -d`; the next deploy sets them back to `develop`. Migrations are not rolled
  back.
- The images carry GHCR names but are not pushed: `docker compose pull` would
  fail for them. Pushing is a later step (phase 9 needs a registry).
