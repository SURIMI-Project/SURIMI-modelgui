# SURIMI model GUI — documentation

| Document | Read it for |
| --- | --- |
| [ARCHITECTURE.md](ARCHITECTURE.md) | How the system fits together today and where it is going: containers, protocols, data model, main flows |
| [plans/](plans/README.md) | Dated plans. Start with [2026-11-03-monorepo-and-backend.md](plans/2026-11-03-monorepo-and-backend.md) |
| [decisions/](decisions/README.md) | Architecture decision records: what was chosen, why, and what was rejected |
| [features/](features/README.md) | One folder per feature: use cases, design, API, changelog |
| [database/](database/README.md) | Database `surimi_modelgui_db`: full schema in DBML, how it is kept in step |
| [ISSUES.md](ISSUES.md) | Open defects and open questions only |
| [CHANGELOG.md](CHANGELOG.md) | User-visible changes and deploy steps, newest first |
| [DIAGRAMS.md](DIAGRAMS.md) | Which Mermaid diagram to use for what, with templates |
| [scenario-output-export-analysis-2026-04-22.md](scenario-output-export-analysis-2026-04-22.md) | Analysis of the first SURIMI output export (JSONL and NetCDF) |

How the docs are kept up to date is in [CLAUDE.md](../CLAUDE.md). The skills in
`.claude/skills/` (`/feature`, `/plan`, `/decision`, `/issue`, `/record`,
`/bruno`) follow the same rules.

## Evidence labels

Every statement of fact says how it is known:

| Label | Meaning |
| --- | --- |
| **Verified** | Reproduced by running it, with the date |
| **Read from source** | Read in code, proto, config or logs, not executed |
| **Open question** | Needs an answer from the user or a partner team |
| **Proposed** | A design not yet confirmed by the user |
