---
name: record
description: Record finished work in the SURIMI model GUI docs and bring every doc that repeats a changed fact back in step. Updates the feature changelog and README, docs/CHANGELOG.md, docs/ISSUES.md, ADR and plan status, docs/ARCHITECTURE.md, .env.example and the Bruno collection as needed. Use after any code or doc change, when the user confirms a fact, accepts a decision or answers an open question, or when they type /record.
---

# Record the work in the docs

## 1. Find out what changed

- `git status` and `git diff` for code changes.
- Anything the user confirmed or decided in this conversation, even with no code
  change. A confirmed fact or an accepted decision is a change to record.

List the changed facts: names, paths, endpoints, env vars, tables, behaviours,
answered questions, accepted or rejected decisions.

If Python changed, run the backend quality gate (`/backend` § 11) now and fix
what it finds; the results go into the changelog entry below. If frontend
files changed, run `npm run build` and `npm run lint` and compare the lint
count with `docs/ISSUES.md` (it must not grow). Do not record work as done
while a check fails.

## 2. Feature docs

If the work belongs to `docs/features/<name>/`:

- Dated entry at the top of its `CHANGELOG.md` (status, files, what was
  verified and what was not, deploy notes). Create the file from
  `docs/features/_template/CHANGELOG.md` on the first change.
- Bring its `README.md` up to date: rewrite the affected section, update the
  diagrams, delete answered open questions.
- Update its status in `docs/features/README.md`.

## 3. Decisions and plans

- A decision the user accepted: set the ADR to `Accepted YYYY-MM-DD` and update
  `docs/decisions/README.md`.
- A decision that changed: new ADR through `/decision`, old one superseded.
- A plan phase finished: mark it done in the plan with the date.

## 4. Platform changelog

Entry in `docs/CHANGELOG.md` when the change is user-visible, changes an API, or
needs a deploy step:

```
## YYYY-MM-DD

### Feature — <title>   (or ### Fix — <title>)

What changed and why, two or three sentences. Link the feature folder.

> **Deploying this:** migrations, env vars, order of rollout.
```

Pure documentation changes do not get an entry.

## 5. Issues

Run the rules of `/issue`: delete what is fixed, rewrite what is partly
answered, add what was found.

## 6. Architecture

Update `docs/ARCHITECTURE.md` when a container, protocol, external dependency,
table or cross-process flow changed. Keep the diagrams and the text in step.

When a table, column, index or enum changed, update
`docs/database/schema.dbml`: by hand before phase 2; from phase 2 regenerate it
from the migrated database as described in `docs/database/README.md`, never by
hand. Update the Mermaid overview in `ARCHITECTURE.md` if a table or relation
was added or removed. When an index changed, update `docs/database/indexes.sql`
and the query table in `docs/database/README.md` § Indexing: every index names
the query it serves.

When a decision changed, also update the **Decisions** table of every feature
README that lists it.

## 7. Every other mention

For each changed fact, search `docs/`, `CLAUDE.md`, the root `README.md` and
`apps/*/README.md`, and fix every stale mention. One fact must read the same in
every file.

When an API or configuration changed, also update:

- the Bruno collection, following `/bruno`;
- `deployments/.env.example`, and `apps/frontend/.env.example` for Vite settings;
- the backend OpenAPI examples (Pydantic `json_schema_extra`).

## 8. Report

Tell the user which files were updated and what changed in each, and name
anything left unrecorded with the reason.
