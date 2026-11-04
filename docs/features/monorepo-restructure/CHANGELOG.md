# Monorepo restructure — changelog

Every change made for this feature, newest first. Each entry says what changed,
where, how it was checked and what deploying it needs. Design is in
[README.md](README.md).

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
