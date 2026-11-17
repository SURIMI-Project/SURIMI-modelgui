# Develop deployment — changelog

Every change made for this feature, newest first. Each entry says what changed,
where, how it was checked and what deploying it needs. Design is in
[README.md](README.md).

---

## 2026-11-17 — Deploy `develop` from the self-hosted runner

**Status:** built; asked by the user 2026-11-17, modelled on BrocoMatuRisk's
`ci-cd.yml` (ADR 0026). **Verified** 2026-11-17 on Windows (Git Bash, Docker
Desktop 29.1) by running `.github/scripts/deploy.sh` against a scratch
`DEPLOY_PATH` with the fake controller and its own project, image names and
ports:

1. No `.env` yet: `.env.example` copied, the run stops with the setup message.
2. First deploy: both images built as `:develop` and `:<commit>`,
   `BACKEND_TAG` / `WEB_TAG` = `develop` with a comment naming the commit,
   `compose.yml` and every mounted file copied, stack up, API healthy, web
   and `/healthz` 200.
3. Nothing changed: nothing built, no container recreated.
4. `bootstrap.sql` changed on the server: restored to the repo's version, only
   `db-bootstrap` re-run.
5. A backend source change: `migrate`, `api`, `worker` rolled.
6. Backend and frontend paths changed but sources identical: both rebuilt,
   both found identical, nothing restarted.
7. A container left on an older image: rolled to `:develop`.
8. `BACKEND_TAG` set to a commit tag by hand (rollback): the next deploy set it
   back to `develop` and rolled only `migrate`, `api`, `worker`.

The first version pinned the commit tag in `.env` (BrocoMatuRisk's way); on
the user's request the server now runs `:develop`, the commit tags kept for
rollback, and the images have GitHub names (`ghcr.io/surimi-project/surimi-modelgui-backend-api`,
`ghcr.io/surimi-project/surimi-modelgui-web`; not pushed). The runner's labels are
`self-hosted`, `Linux`, `X64`.

Found and fixed while testing: the old image id was read after the build had
moved the pinned tag (a re-run of the same commit always looked identical);
two builds of the same sources got different ids because of BuildKit's
provenance attestation (now `--provenance=false --sbom=false`).

**Not verified:** a run on the develop server itself (Linux, the runner,
`sudo`, the `deployer` owner; on Windows `chown` warned, as expected, since
there is no such user), the `deploy-develop` job in GitHub Actions, the
profiles of the server's stack (keycloak, prometheus and grafana recreates ran
only as "not running").

`deployments/`:

- `compose.yml` — images only: `${BACKEND_IMAGE:-ghcr.io/surimi-project/surimi-modelgui-backend-api}:${BACKEND_TAG:-develop}`
  (migrate, api, worker) and `${WEB_IMAGE:-ghcr.io/surimi-project/surimi-modelgui-web}:${WEB_TAG:-develop}`;
  `logging: *logging` (json-file, 5 × 10 MB) on every service, not only the
  backend and web.
- `compose.local.yml` — new, standalone: the same stack with `build:` and the
  same image names with tag `:local`.
- `.env.example` — section "images": `BACKEND_IMAGE`, `BACKEND_TAG`,
  `WEB_IMAGE`, `WEB_TAG`.

`.github/`:

- `scripts/deploy.sh` — the deploy (change detection against
  `.deployed-commit`, `docker build` as `:develop` and `:<commit>`, rolls
  only on a new image id, file sync in place, health wait, owner, prune).
- `scripts/check-compose-files.py` — fails when the two compose files differ
  outside image and build (checked: passes; a planted `max-size` change fails).
- `workflows/ci.yml` — `workflow_dispatch` with "redeploy everything"; jobs
  `compose-files` and `deploy-develop` (self-hosted, environment `develop`,
  after every other job, never cancelled); branch runs now queue instead of
  cancelling each other (pull requests still cancel).

Other: `package.json` (`docker:*` use `compose.local.yml`), `README.md`,
`CLAUDE.md`, local-run commands in the database, auth-and-users,
backend-console, backend-skeleton and observability READMEs and the Bruno
`api` folder.

**Deploy:** on the server, once: Docker, git, the `deployer` user, the runner
(labels `self-hosted`, `Linux`, `X64`) in the `docker` group or with passwordless
sudo; GitHub environment `develop` with `DEPLOY_PATH`. The first run stops
until `$DEPLOY_PATH/deployments/.env` exists. Locally, images are now
`ghcr.io/surimi-project/surimi-modelgui-backend-api:local` and
`ghcr.io/surimi-project/surimi-modelgui-web:local`: the next `npm run docker:up`
builds them.
