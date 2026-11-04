---
name: feature
description: Start or continue a feature in the SURIMI model GUI monorepo. Reads the feature's docs, related ADRs and open issues first, creates docs/features/<name>/ from the template when it is new, writes the design (use cases, sequence and state diagrams, API, decisions with reasons) before the code, and logs every step in the feature changelog. Use when the user asks to implement, design, extend or resume a feature, or types /feature <name>.
---

# Feature work

The argument is the feature name in kebab-case, for example `auth-and-users`.
If none is given, pick the matching folder under `docs/features/` or propose a
name and say which one you chose.

## 1. Read before touching code

- `docs/features/<name>/README.md` and `CHANGELOG.md`, if they exist.
- The ADRs the README links to, and any ADR in `docs/decisions/README.md` whose
  title touches the same area.
- Items in `docs/ISSUES.md` that concern the same code.
- The matching section of `docs/ARCHITECTURE.md`.
- The current plan in `docs/plans/` if the feature is part of one.

Tell the user in two or three lines what the docs already say: status, last
change, open questions.

## 2. New feature: create the folder

Copy `docs/features/_template/README.md` and `CHANGELOG.md` into
`docs/features/<name>/`, fill the title, and add a row to
`docs/features/README.md` with status `Planned`.

## 3. Design first

Fill the feature README before writing code. Follow `docs/DIAGRAMS.md` for the
diagrams.

- **Summary** — one paragraph: what the feature lets which user do.
- **Decisions** — a table of every decision the feature relies on: decision,
  why in one line, where it is recorded. A reader must understand the feature's
  choices from this table alone, without opening the ADRs. Decisions that also
  shape other features get an ADR (`/decision`) and a row here linking it;
  feature-only decisions say "this file" and are explained under Target
  behaviour.
- **Use cases** — a Mermaid use-case diagram (flowchart with actors) and a table
  of use cases: actor, goal, pre-conditions, main flow, failure cases.
- **Current state** — what the code does today, with file links and the
  evidence label.
- **Target behaviour** — the detail behind each "this file" decision: what,
  **why**, and the alternative rejected and why. For ADR decisions, only what
  is specific to this feature (settings, limits); the reasoning stays in the
  ADR.
- **Flows** — a `sequenceDiagram` for every flow that crosses a process
  boundary (browser, backend, worker, controller, Keycloak, storage).
- **State** — a `stateDiagram-v2` when the feature has a lifecycle.
- **Data** — the tables it adds or changes, in `docs/database/schema.dbml`
  (by hand before phase 2, regenerated from the database after), and an
  `erDiagram` here when the relations need explaining.
- **API** — table of method, path, role, request, response, errors.
- **Where the changes are** — table of area, file, change.
- **Observability** — logs, metrics and audit events the feature emits.
- **How to test** and **What has been verified**.
- **Open questions** — what needs an answer from the user or a partner team (Rik
  for the controller). Ask the user the ones that block the work.

Remove template sections that do not apply. Do not leave empty headings.

## 4. Implement in steps, log each one

Backend code follows `/backend`. Before a step counts as working, run its
quality gate (`/backend` § 11: Ruff, Ruff format, mypy strict, pytest) and
fix every finding. Frontend work waits for phase 10 (CLAUDE.md).

After each working step add an entry at the top of the feature `CHANGELOG.md`:

```
## YYYY-MM-DD — short title

**Status:** what is done, and how it was checked: the gate's result per
command (Ruff, format, mypy strict clean; N tests pass, M integration), run
against the fake controller or not run against EDITO, …

`apps/<app>/…`:

- `path/to/file` — what changed.

**Deploy:** migrations, env vars, order. Only when it matters.
```

Keep the README in step with what was built. When a decision changes, rewrite
the section and, if it was an ADR, supersede the ADR. Do not append a correction
below the old text.

## 5. Close out

Run `/record`. It updates `docs/CHANGELOG.md`, `docs/ISSUES.md`,
`docs/ARCHITECTURE.md`, the Bruno collection and every doc that repeats a fact
you changed.
