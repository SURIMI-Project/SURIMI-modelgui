# 0001 — One repo with apps/, packages/ and deployments/, npm and uv workspaces

**Status:** Proposed
**Date:** 2026-11-03
**Related:** [plan](../plans/2026-11-03-monorepo-and-backend.md), [features/monorepo-restructure](../features/monorepo-restructure/README.md)

## Context

- The repo was a single Vite app at the root (`src/`, `package.json`). A Python
  backend and worker are to be added. **Read from source.**
- Two toolchains will live side by side: Node for the frontend, Python for the
  backend. Each needs one lock file and one place to run its tools.
- Some code is shared without being an app: the generated controller stubs
  (ADR 0011).
- The frontend and backend change together (an endpoint and the page that
  uses it), so one pull request should be able to carry both.

## Decision

```
apps/frontend/      React app (moved from src/ with git mv)
apps/backend/       FastAPI API and worker, one Python package, uv
packages/proto/     controller stubs, generated (ADR 0011)
deployments/        compose.yml, nginx/, envoy/, postgres/, .env.example
resources/bruno/    Bruno collection
docs/               documentation
package.json        npm workspaces: ["apps/frontend"], delegating scripts
pyproject.toml      uv workspace: members ["apps/backend", "packages/proto"], shared Ruff config
```

Root scripts keep simple names (`npm run dev`, `npm run build`,
`npm run lint`, `npm run docker:up`); Python runs through
`uv run --package <member> …`. No Nx or Turborepo.

## Why

- `apps/` holds what is deployed, `packages/` what is shared, `deployments/`
  how it runs: three questions, three places, so a new member of the team
  finds things without reading the build files.
- npm workspaces and uv workspaces are the native tools of each ecosystem: no
  extra build system to learn, one lock file per language, shared settings at
  the root (Ruff, Node version).
- One repo keeps API and UI changes in one review and one version.
- `git mv` keeps file history for the frontend.

## Alternatives considered

| Option | Why not |
| --- | --- |
| Two repos (frontend, backend) | Every API change needs two PRs and coordinated releases; contract drift between them |
| Everything under `services/`, one standalone project per folder | No place for shared code; each service carries its own tooling and lock file |
| Nx or Turborepo | Build caching and task graphs pay off with many JS packages; here there is one JS app and one Python app |
| pnpm instead of npm | The repo already has `package-lock.json` and `.nvmrc`; switching gives little for one package |
| Backend under `server/` next to `src/` | Mixes two toolchains at the root; Docker contexts and CI paths get tangled |

## Consequences

- Phase 1 moves files; imports inside the frontend do not change, but Docker,
  CI, `.vscode/launch.json` and README paths do.
- Image builds use the repository root as context, because the lock files are
  there; a root `.dockerignore` keeps the context small.
- CI runs frontend and backend jobs filtered by path.
- Developers need Node 22 and uv.
