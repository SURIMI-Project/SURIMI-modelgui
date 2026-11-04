---
name: decision
description: Record an architecture decision as an ADR in docs/decisions/NNNN-<slug>.md with context, the decision, why, the alternatives rejected and the consequences, and keep the ADR index in step. Also supersedes or accepts existing ADRs. Use when a library, framework, protocol, storage, auth pattern, repo structure or cross-cutting convention is chosen or changed, when the user confirms or rejects a proposed decision, or when they type /decision <title>.
---

# Record an architecture decision

An ADR exists so that nobody has to ask "why did we do it this way?". It is
short, it names the alternatives, and it is never edited after acceptance except
to change its status.

## 1. Check what exists

Read `docs/decisions/README.md`. If an ADR already covers the topic:

- same decision, more detail → edit it while it is `Proposed`;
- different decision → write a new ADR and set the old one's status to
  `Superseded by NNNN` (and nothing else in the old file).

## 2. Write it

Next free number, four digits. File `docs/decisions/NNNN-<kebab-slug>.md`.
Copy `docs/decisions/_template.md`:

```markdown
# NNNN — <Decision as a short statement>

**Status:** Proposed | Accepted YYYY-MM-DD | Superseded by NNNN | Rejected YYYY-MM-DD
**Date:** YYYY-MM-DD
**Related:** features, plans, issues

## Context
The problem and the forces: requirements, constraints, facts with evidence
labels. No solution here.

## Decision
What we will do, in one paragraph, concrete enough to act on (library names and
versions, protocol, where the code goes).

## Why
The reasons, as bullets, each tied to a force from the context.

## Alternatives considered
| Option | Why not |
| --- | --- |

## Consequences
What becomes easier, what becomes harder, what we must now do (follow-up work,
migrations, docs).
```

Rules:

- One decision per ADR. If you find yourself writing "and also", split it.
- At least two real alternatives, including "do nothing" when it is plausible.
- Facts carry evidence labels (Verified, Read from source, Open question).
- No code beyond a short snippet that shows a convention.

## 3. Index

Add or update the row in `docs/decisions/README.md`: number, title, status,
date.

## 4. Link

Link the ADR from the feature README or plan that depends on it, and from
`docs/ARCHITECTURE.md` when it changes a container or protocol.

## 5. Report

Tell the user the decision and the reason in two lines, and that it is
`Proposed` until they accept it.
