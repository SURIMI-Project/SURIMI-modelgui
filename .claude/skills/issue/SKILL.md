---
name: issue
description: Add, rewrite or close items in docs/ISSUES.md, the list of open defects and open questions for the SURIMI model GUI and the services it depends on (controller, market, output creator). Each item carries severity, evidence label, what it affects and what fixing it takes. Use when a defect, data problem or unanswered question is found, when something in ISSUES.md is fixed or answered, or when the user types /issue.
---

# Maintain the open issues

`docs/ISSUES.md` holds only what is open. A fixed item is deleted, not marked
fixed; the fix is recorded in the feature or platform `CHANGELOG.md`.

## Sections

Items live under one of these headings, most serious first inside each:

| Section | Holds |
| --- | --- |
| `## This repo` | Defects in `apps/frontend`, `apps/backend`, deployments, docs |
| `## Controller and model services` | Defects in services owned by partners (controller, Ecopath, market, fisheries authority, output creator). Says who owns it |
| `## Simulation output data` | Problems seen in experiment outputs (`.nc`, `.bin`) |
| `## Open questions` | Questions that need an answer, with who must answer |

## Adding an item

```markdown
### <Short statement of what is wrong>

**Severity:** High | Medium | Low — <what it affects in one line>
**Evidence:** Verified YYYY-MM-DD | Read from source | Open question
**Owner:** this repo | Rik (controller) | <team>
**Where:** [file.py:12](../apps/backend/…#L12) or service and RPC

What happens, with the input that shows it and the output seen.

**Fix:** what fixing it would take, or what we do meanwhile (workaround in the
backend, validation, …).
```

- Severity High: wrong numbers shown to users, lost or leaked data, security,
  runs that cannot complete. Medium: a broken feature with a workaround. Low:
  everything else.
- Number nothing; headings are the anchors.
- One defect per item. Before adding one, search the file for the same code or
  symptom and extend that item instead.

## Closing or rewriting an item

- Fixed or confirmed: delete the item. No "Update" or "fixed on" note.
- Partly answered: rewrite it so it states only what is still open.
- An answered question: delete it and put the answer where the fact belongs (a
  feature README, ARCHITECTURE.md, an ADR).

## Report

List the items added, rewritten and deleted.
