---
name: plan
description: Write or update a dated plan in docs/plans/ for work that spans several features or phases (a restructure, a new service, a migration). Records goals, constraints, phases with exit criteria, the decisions the plan relies on (as ADRs), risks and open questions. Use when the user asks for a plan, a roadmap, an approach or "how should we build X", or types /plan <topic>.
---

# Write a plan

A plan says what will be built, in which order, and why. It is the document a
new team member reads to understand the direction. Individual decisions live in
ADRs (`docs/decisions/`) and individual designs in feature folders
(`docs/features/`); the plan links them instead of copying them.

## 1. Gather the facts first

- Read `docs/ARCHITECTURE.md`, `docs/ISSUES.md`, `docs/decisions/README.md`,
  `docs/features/README.md` and any earlier plan on the same topic.
- Read the code that the plan changes. Check versions, paths and protocols in
  the source; do not plan from memory.
- When the plan depends on an external API (the controller, Keycloak, EDITO),
  read its contract (`buf.build/surimi/surimi-protocol`, the Bruno collection).

## 2. File

`docs/plans/YYYY-MM-DD-<topic>.md`. A new plan on a topic that already has one
supersedes it: set the old plan's status line to
`Superseded by [<new file>](<new file>)` and leave the rest unchanged.
Add a row to `docs/plans/README.md`.

## 3. Structure

```markdown
# <Title>

**Status:** Proposed | Accepted YYYY-MM-DD | In progress | Done | Superseded by …
**Author:** <name>, YYYY-MM-DD

## Goal
What the result lets users and the team do. Two to five bullets.

## Requirements
Numbered list, each one testable. Mark which came from the user and which were
inferred.

## Constraints and facts
What the plan cannot change (controller protocol, EDITO platform, team skills),
each with its evidence label.

## Target architecture
One container diagram (Mermaid) and a link to docs/ARCHITECTURE.md.

## Decisions
Table: decision, choice, why (one line), ADR link. Every row has an ADR.

## Phases
One subsection per phase: scope, deliverables, exit criteria (what must be
true to call it done), features touched.

## Risks
Table: risk, likelihood, impact, mitigation.

## Suggested improvements
Things outside the stated requirements that would make the result better, each
with the reason.

## Open questions
Who has to answer each one.
```

## 4. Decisions

For every choice in the Decisions table run `/decision`, so each has an ADR with
its alternatives. New ADRs start as `Proposed`. When the user accepts the plan,
mark the plan and its ADRs `Accepted` with the date.

## 5. Features

Create a feature folder (`/feature`, design section only) for each feature the
plan introduces, with status `Planned`, so the detailed design has a home.

## 6. Report

Give the user the plan's decisions with their reasons, the phases, and the open
questions that block phase 1.
