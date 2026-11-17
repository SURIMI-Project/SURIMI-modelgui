# Monorepo restructure — changelog

Every change made for this feature, newest first. Each entry says what changed,
where, how it was checked and what deploying it needs. Design is in
[README.md](README.md).

---

## 2026-11-17 — gRPC-Web proxy (Envoy) removed

**Status:** done (user, 2026-11-17, chosen over keeping it until phase 10).
Only the backend calls the controller now. The current frontend still has its
gRPC-Web client, so the web image is built with `MOCK=true` by default and
shows canned scenarios and run statuses until phase 10; with `MOCK=false` those
pages fail. **Verified** 2026-11-17 in a separate compose project: the web image
builds; `GET /` 200, `POST /api/controller/...` 410, `GET /api/v1/auth/providers`
200 through nginx; the rendered nginx config has no controller upstream.
`docker compose config` is valid with every profile. Not checked: the old
frontend's pages in a browser.

- `deployments/compose.yml` — service `grpc-proxy` and `CONTROLLER_BASE_URL`
  removed; build arg `MOCK` defaults to `true`; header comments.
- `deployments/mounts/envoy/` — deleted (`envoy.yaml.template`, `entrypoint.sh`).
- `deployments/nginx/default.conf.template` — `/api/controller/` returns `410`
  instead of proxying.
- `apps/frontend/Dockerfile` — `ARG MOCK=true`; no `CONTROLLER_BASE_URL`.
- `apps/frontend/.env.example`, `deployments/.env.example` — `MOCK=true`;
  `GRPC_PROXY_PORT`, `CONTROLLER_BASE_URL`, `CORS_ALLOWED_ORIGINS` and the
  `grpc-proxy` section removed.
- Bruno: folder `grpc-proxy/` renamed `controller/`, variable `urlGrpcProxy`
  renamed `urlController`; `local` now calls the `project-surimi` controller
  directly instead of Envoy on port 18081.
- Docs: `ARCHITECTURE.md` (Part 1, deployment), `ISSUES.md` (the High item
  "the browser can call the controller" is closed for this repo; what remains,
  the controller's public unauthenticated address, moved to the controller
  section), ADR 0001 and 0006, the plan's phase 10, `CLAUDE.md`, `README.md`,
  the experiment-queue and monorepo-restructure READMEs, the `/bruno` skill.

**Deploy:** rebuild the web image (`docker compose ... up --build -d`). A
`grpc-proxy` container left from an earlier run is an orphan: add
`--remove-orphans` once.

---

## 2026-11-17 — Mounted files under `deployments/mounts/`

**Status:** done (user, 2026-11-17). Everything compose mounts into a
container moved, with `git mv`, to `deployments/mounts/<service>/`:
`postgres/`, `keycloak/`, `envoy/`, `observability/`. `nginx/` stays in
`deployments/`: it is not mounted, the web image copies it at build time
(`apps/frontend/Dockerfile`). **Verified** 2026-11-17: `docker compose config`
resolves every bind mount into `deployments/mounts/` and each source exists;
in a separate compose project `db-bootstrap` ran the moved `bootstrap.sql`
(exit 0), Prometheus started with the moved config and Grafana loaded the
dashboard. Envoy and Keycloak were not started.

- `deployments/compose.yml` — the six bind mounts; a header comment on `mounts/`.
- `.github/workflows/ci.yml` — backend path filter `deployments/mounts/postgres/**`.
- `apps/backend/tests/conftest.py` — `BOOTSTRAP_DIR`, the folder the test PostgreSQL
  container mounts. Missed in the first commit: CI failed (run 44076397150,
  `/bootstrap/bootstrap.sql: No such file or directory`); fixed, and the full
  suite passes again (321 tests, 118 against PostgreSQL in Docker).
- `deployments/mounts/observability/grafana/provisioning/dashboards/dashboards.yml` — comment.
- Docs: ADR 0001 (the layout rule), ADR 0006, ADR 0014, `CLAUDE.md`,
  `docs/database/README.md`, `docs/ISSUES.md`, feature READMEs of
  auth-and-users, backend-skeleton, monorepo-restructure,
  observability-and-activity. Dated changelog entries keep the old paths.

**Deploy:** nothing for a running stack: the next `docker compose up`
mounts from the new paths. Named volumes (`postgres-data`, `prometheus-data`)
are unchanged.

---

## 2026-11-03 — LF line endings everywhere

**Status:** done; all 599 text files in the working tree are LF (byte-level
scan); backend tests, frontend build and DBML conversion re-run and pass.

- `.gitattributes` — `* text=auto eol=lf` for every text file, explicit
  `binary` for images, videos, `.binpb`, `.nc`, `.bin`, fonts; generated stubs
  marked `linguist-generated`.
- `.editorconfig` — new: `end_of_line = lf`, UTF-8, final newline.
- `.vscode/settings.json` — new: `"files.eol": "\n"`.
- Converted to LF: `apps/frontend/public/loadingFish.svg`, the three CSVs in
  `apps/frontend/src/data/assets/` (the parser splits on `/\r?\n/`, so
  behaviour is unchanged), and 19 new docs, SQL and test files that edit
  scripts had written with CRLF.

**Deploy:** nothing. Existing clones get LF for these files on the next
checkout; the index of the three CSVs changes when they are staged.

---

## 2026-11-03 — Frontend moved to `apps/frontend`, deployment files to `deployments/`, CI added

**Status:** done on branch `feature/monorepo-and-backend`, not committed or
merged. Build passes and gives the same bundle as before the move; dev server
starts from the root; lint unchanged from `main` (25 known problems, report
only in CI); image built and served through the moved compose file; Envoy
chain forwards, but no controller on EDITO was answering, so no successful
call end to end; CI workflow checked with `actionlint`, not run on GitHub.

`apps/frontend/` (moved with `git mv` from the root):

- `src/`, `public/`, `proto/`, `index.html`, `vite.config.ts`,
  `tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json`,
  `eslint.config.js`, `buf.gen.yaml` — unchanged.
- `package.json` — name `@surimi/frontend`; `docker:*` scripts removed (now
  at the root).
- `Dockerfile` — build context is the repo root: copies the root
  `package.json` and `package-lock.json`, runs `npm ci` for the workspace,
  builds with `npm --workspace apps/frontend run build`, copies
  `deployments/nginx/default.conf.template`.
- `.env.example` — new, Vite settings (`VITE_API_BASE_URL`, `MOCK`).

`deployments/` (moved with `git mv`):

- `compose.yml` — `name: surimi-modelgui`; `web` builds with context `..` and
  `apps/frontend/Dockerfile`.
- `nginx/`, `envoy/` — unchanged.
- `.env.example` — compose settings only (`SURIMI_PORT`, `MOCK`,
  `CONTROLLER_BASE_URL`, `CONTROLLER_GRPC_URL`, `GRPC_PROXY_PORT`,
  `CORS_ALLOWED_ORIGINS`).

Root:

- `package.json` — new: workspace `apps/frontend`, scripts `dev`, `build`,
  `lint`, `preview`, `proto:pull`, `proto:gen` delegate to it (the first four
  end in `--` so extra arguments reach Vite and ESLint); `docker:up`,
  `docker:down`, `docker:logs` use `deployments/compose.yml`.
- `package-lock.json` — regenerated; no version changes.
- `.dockerignore` — rewritten for the root build context.
- `.gitignore` — `output_folder/`.
- `.vscode/launch.json` — configuration `frontend`, runs `npm run dev` from
  the root, no `envFile`.
- `.github/workflows/ci.yml` — new: path filter, `npm ci`, build, lint with
  `continue-on-error`, image build with Buildx (not pushed).
- `README.md`, `CLAUDE.md` — new commands and layout.

**Deploy:** a local `.env` moves: compose settings to `deployments/.env`, Vite
settings to `apps/frontend/.env`. Run compose with
`-f deployments/compose.yml` (or the unchanged `npm run docker:*` scripts).
