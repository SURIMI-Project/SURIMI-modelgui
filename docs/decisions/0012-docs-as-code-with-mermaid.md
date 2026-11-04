# 0012 — Docs as code in the repo: features, ADRs, plans, issues, Mermaid diagrams

**Status:** Proposed
**Date:** 2026-11-03
**Related:** [CLAUDE.md](../../CLAUDE.md), [DIAGRAMS.md](../DIAGRAMS.md)

## Context

- Requirement: document every feature, the plans and the decisions taken, and
  the open issues; features may carry use-case diagrams; an architecture
  description is wanted.
- Documentation kept outside the repository (wikis, shared drives) drifts
  from the code, because nobody reviews it in the same change.
- A decision that spans several features, written into each of them, ends up
  copied and then contradicted in some.
- Open defects mixed with fixed ones make the list of what is still wrong
  hard to read.

## Decision

Keep the documentation in the repository: one folder per feature
(`docs/features/<name>/` with `README.md` and `CHANGELOG.md`), `docs/ISSUES.md`
holding only what is open, a project `docs/CHANGELOG.md`, `docs/decisions/` for
ADRs and `docs/plans/` for dated plans. Diagrams are Mermaid inside the Markdown,
following `docs/DIAGRAMS.md`. The database schema is also kept as DBML in
`docs/database/schema.dbml`: written by hand until the backend exists, then
regenerated from the migrated database with `db2dbml` (`@dbml/cli`), so it
never drifts from the migrations. Every feature README opens with a
**Decisions** table that lists each decision it relies on, with the reason and
a link to the ADR when the decision is shared. Skills in `.claude/skills/`:
`/feature`, `/plan`, `/decision`, `/issue`, `/record`, `/bruno`,
`/surimi-services`, `/backend`. Evidence
labels on facts: Verified, Read from source, Open question, Proposed.

## Why

- Docs in the same pull request as the code are reviewed together and go stale
  less.
- ADRs give each cross-cutting choice one home, with its alternatives, so
  features link instead of repeating.
- Mermaid renders on GitHub and in VS Code with no extra tooling and diffs as
  text.
- The skills make the update steps happen every time, not only when someone
  remembers.
- DBML carries types, defaults, indexes and enums that an ER diagram cannot,
  converts to SQL, and is drawn by dbdiagram.io; generating it from the live
  database removes the risk of two hand-kept schemas disagreeing. Mermaid stays
  for the overview because GitHub does not render DBML.
- Shared decisions live once, in an ADR; the Decisions table in each feature
  repeats only the one-line summary, so a feature still reads on its own
  (asked for on 2026-11-03).

## Alternatives considered

| Option | Why not |
| --- | --- |
| Wiki (GitHub, Confluence) | Separate from code review; drifts |
| PlantUML or draw.io | Not rendered by GitHub; binary or extra tooling |
| Structurizr DSL for C4 | Strong for large systems; needs its own renderer |
| Only README files per app | No place for decisions, issues or cross-app flows |
| Decisions only inside feature READMEs, no ADRs | Shared decisions (auth, database, protocols) would be copied into several features and drift apart |
| Hand-kept DBML after the backend exists | Second schema next to the migrations; they would disagree |

## Consequences

- Every change has a docs step; `/record` makes it routine.
- Mermaid lacks a native use-case diagram; a flowchart convention stands in.
