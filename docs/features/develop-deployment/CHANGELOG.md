# Develop deployment — changelog

Every change made for this feature, newest first. Each entry says what changed,
where, how it was checked and what deploying it needs. Design is in
[README.md](README.md).

---

## 2026-11-17 — Outputs folder under `mounts/experiments`

**Status:** built (user: the outputs are mounted, so they belong under
`mounts/`). The default `OUTPUTS_LOCAL_DIR` is now `./mounts/experiments`
(was `../output_folder/experiments`) in both compose files. `mounts/` now holds
configuration, synced from the repo, and runtime data folders
(`RUNTIME_DIRS="experiments"` in `deploy.sh`), which the sync never copies,
deletes or prunes, and whose content is not chowned. **Verified** 2026-11-17
against a scratch `DEPLOY_PATH`: the first deploy created
`mounts/experiments`; an output file and an empty run folder put there
survived the next deploy and were visible in the api and web containers at
`/data/experiments`; a config file deleted from the repo (`mounts/postgres/
old.sql`) was still removed. Found and fixed on the way: `find -delete` turns
on depth-first order, where `-prune` does nothing, so the empty-folder
cleanup excludes the data folders by path. The two compose files are still
in step.

- `.github/scripts/deploy.sh` — runtime data folders kept out of the sync and the chown.
- `deployments/compose.yml`, `deployments/compose.local.yml` — the default outputs path.
- `.gitignore`, `.dockerignore` — `deployments/mounts/experiments`.
- `deployments/.env.example` — `OUTPUTS_LOCAL_DIR` and how to mount `output_folder/` instead.
- Docs: ADR 0001, this feature's README, `CLAUDE.md`, `README.md`.

**Deploy:** on the server, outputs written to `$DEPLOY_PATH/output_folder/experiments`
before this change stay there; move them to
`$DEPLOY_PATH/deployments/mounts/experiments` (or set `OUTPUTS_LOCAL_DIR` to
the old folder). With `OUTPUTS_URI=s3://…` the folder is unused. Locally, to
keep using the copies in `output_folder/`, set
`OUTPUTS_LOCAL_DIR=../output_folder/experiments` in `deployments/.env`.

---

## 2026-11-17 — TLS proxy on the develop server

**Status:** documented and one fix built. The server's nginx terminates TLS for
`modelgui-dev.surimi.konnecta.io` and proxies to `web` on `127.0.0.1:18081`
(the server's `SURIMI_PORT`; the API stays on `127.0.0.1:18082`, not proxied)
(README § TLS in front). The stack's nginx used to overwrite
`X-Forwarded-Proto` with its own `http`, so behind TLS the API would build
`http://` redirects; it now keeps the value a proxy in front sent
(`map $http_x_forwarded_proto $surimi_forwarded_proto`). **Verified**: the
rendered template passes `nginx -t` (nginx 1.27); `SURIMI_PORT=127.0.0.1:18080`
gives `web` the port `127.0.0.1:18080:80` (`docker compose config`). **Not
verified:** the server's nginx and certificate.

- `deployments/nginx/default.conf.template` — the `map` and both
  `X-Forwarded-Proto` lines.
- `resources/bruno/surimi-modelgui/environments/develop.yml` — new: `apiUrl`
  `https://modelgui-dev.surimi.konnecta.io`, the same variables as the others.

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
