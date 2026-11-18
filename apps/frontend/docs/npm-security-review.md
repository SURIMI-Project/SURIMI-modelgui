# npm security review

Investigated on 2026-11-18 on macOS (Apple Silicon), Node 24.22.1 and npm 11.19.1.

## Findings

- `npm audit`: 20 affected packages (2 low, 4 moderate, 13 high, 1 critical).
- `npm audit --omit=dev`: 5 affected packages (2 moderate, 2 high, 1 critical). Package counts include dependency chains; they do not establish application exploitability.
- Production findings: `maplibre-gl`, `react-router`, `react-router-dom`, `ajv` and `protocol-buffers-schema`.
- MapLibre 5.20.0 has a critical attribution HTML sanitizer bypass. The advisory lists versions through 6.4.0 as affected and 6.4.1 as patched. Both current map components set `attributionControl: false`, reducing apparent exposure to the described attribution path; this is not a complete security assessment.
- React Router is used through browser routing. Several reported advisories concern server rendering or RSC features; assess each against the actual application.
- Development findings include Vite, Rollup, Babel, PostCSS and ESLint dependencies. The esbuild finding concerns its development server on Windows.

## Fix preview

`npm audit fix --dry-run --ignore-scripts` proposed compatible updates, including:

| Package | Installed | Preview target |
| --- | --- | --- |
| vite | 7.3.1 | 7.3.8 |
| react-router / react-router-dom | 7.13.0 | 7.18.5 |
| rollup | 4.57.1 | 4.68.5 |
| maplibre-gl | 5.20.0 | 5.24.1 (still affected) |

- npm suggested MapLibre 6.19.0 and esbuild 0.28.2 when allowing breaking changes.
- The dry run did not apply fixes; its audit output still reported the installed findings. Do not treat the preview as a verified clean dependency tree.
- Registry versions and advisories change. Repeat the audit before remediation.

## Install-script warnings

- `npm install-scripts ls` reported `esbuild@0.27.7` and `fsevents@2.3.3` without explicit `allowScripts` entries.
- esbuild's postinstall prepares and validates its platform executable; fsevents is an optional macOS file-watching dependency of Vite/Rollup.
- An esbuild transformation and loading the fsevents native module both succeeded on this Mac.
- Review explicit, version-pinned script approvals separately from vulnerability fixes. Do not approve all dependency scripts blindly.
- npm documents `install-scripts` as unaware of workspaces; policy changes must be made deliberately at the appropriate project root.

## Follow-up

- [ ] Re-run full and production-only audits.
- [ ] Apply compatible fixes and review the root lockfile diff.
- [ ] Upgrade MapLibre separately; check map rendering and custom water layers.
- [ ] Review the explicit esbuild dependency and update it separately if still needed.
- [ ] Review and record install-script policy.
- [ ] Run frontend build and lint, then manually check login, routing and maps.
- [ ] Audit again and record any remaining findings with their actual exposure.

No dependency fixes or approvals were applied during investigation. The pre-existing root `package-lock.json` changes were preserved.

## Sources

- [MapLibre advisory](https://github.com/advisories/GHSA-jrc7-96c5-q579)
- [npm install-script policy](https://docs.npmjs.com/cli/v11/commands/npm-install-scripts/)
- Local outputs from `npm audit --json`, `npm audit --omit=dev`, `npm audit fix --dry-run --ignore-scripts` and `npm install-scripts ls`.
