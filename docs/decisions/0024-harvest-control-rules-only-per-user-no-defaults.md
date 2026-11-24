# 0024 — Harvest control rules are only the user's own, per scenario; no scenario defaults

**Status:** Accepted 2026-11-16 (user); one set per scenario (decisions 3 to 5) superseded the same day by [0025](0025-several-named-hcr-configurations-per-scenario-in-jsonb.md): several named configurations; decision 3 (empty fields, nothing prefilled) superseded 2026-11-23 by [0027](0027-hcr-initial-data-and-defaults-from-the-controller.md): the controller's defaults prefill new rows
**Date:** 2026-11-16
**Related:** [features/harvest-control-rules](../features/harvest-control-rules/README.md), [features/experiments](../features/experiments/README.md), supersedes the scenario defaults of [0018](0018-harvest-control-rules-per-user-and-scenario.md) (decision 1's `owner_id` null, decision 2 and the defaults in decision 4)

## Context

- ADR 0018 kept scenario defaults (rows with no owner), managed by admins and
  seeded by `surimi-backend seed-hcr` from the controller team's example CSV. A user with no
  rules saw and used the defaults; "reset" deleted their rows to fall back to
  them.
- The defaults never had a real source. The controller team's example (mail 2026-10-16) gave
  four rows, of which only `BFT` is HCR-eligible; the list of values for all
  species that the project asked the Ecopath and controller teams for has not arrived. **Read from
  source** (`catalog/data/*_hcr_defaults.csv`, the seed report).
- The reference values people set limits against come from the controller on
  every request: `GetInitialBiomasses` and `GetInitialFishingMortalities`
  (`GET /api/v1/scenarios/{name}/experiment-options`). **Verified** 2026-11-16
  for `northwestern_med`.
- The user, 2026-11-16: the initial biomass and fishing mortality come from the
  controller; admins will not save any defaults; each user saves their own
  preconfigured biomass limits, biomass bases and fishing mortalities per
  scenario.

## Decision

1. Every row of `harvest_control_rules` has an owner: `owner_id` is NOT NULL.
   Migration `0006_hcr_owner_required` deletes the default rows and rebuilds the
   unique index `(owner_id, scenario_name, species_code, lower(life_stage))`
   without `NULLS NOT DISTINCT`. (Since 2026-11-16 the table is
   `hcr_configurations`, ADR 0025, created owner-required from the start by
   `0007_hcr_configurations`; `0006_hcr_owner_required` no longer exists.)
2. No defaults anywhere: the admin routes
   `/api/v1/admin/scenarios/{name}/hcr-defaults`, `POST …/hcr/reset`,
   `surimi-backend seed-hcr`, `hcr/seed.py` and the
   `catalog/data/<scenario>_hcr_defaults.csv` files are removed.
3. A user who saved nothing for a scenario has no rules: `GET …/hcr` answers
   `rules: []`, and the experiment form shows every HCR-eligible entry with
   empty fields and the controller's initial biomass and F beside them.
4. `PUT /api/v1/scenarios/{name}/hcr` with `{rules: [...]}` saves a user's whole
   set for one scenario in one transaction, all or nothing; `[]` deletes it.
   The per-rule `POST`, `PATCH` and `DELETE` stay for API clients.
5. `POST /experiments` without `harvest_control_rules` uses the user's saved
   rules, and none when they saved none.

## Why

- The user's decision: admins do not maintain HCR values; the controller's
  initial values are the reference.
- Defaults with no source would be numbers nobody owns; the only one loaded
  (`BFT`) came from an example mail, not from the partners.
- One kind of row is simpler: no null owner, no admin surface to secure and
  audit, no seed in the migrate job.
- A whole-set `PUT` matches how the form edits rules (a table of ticked rows):
  one request, no half-saved table when one row is refused, no rule ids to
  track in the browser.

## Alternatives considered

| Option | Why not |
| --- | --- |
| Keep the defaults table and routes, left empty | Code, routes and a seed that nobody uses; an admin could still fill it and silently change what users run |
| Derive starting values from the initial values (for example limit = a share of the initial biomass) | Makes up a rule that no partner gave; the user wants the controller's values shown, not turned into rules |
| Several named rule sets per user and scenario | Not asked for; a `set_name` column can be added later without breaking this |
| Save from the form with one `POST`/`PATCH`/`DELETE` per row | Several requests, not atomic: one refused row leaves a mix of old and new rules |

## Consequences

- New users start each scenario with no rules. Whether an experiment can run
  with no HCR at all is still an open question for the controller team
  ([features/harvest-control-rules](../features/harvest-control-rules/README.md#open-questions)).
- The migration deleted the default rows for good (it no longer exists since the
  migrations were rebuilt one per feature, 2026-11-16); its downgrade restored the
  nullable column and the index, not the rows.
- With the seed gone, the backend converts no units at all: kg from the
  database to the controller (ADR 0022); tonnes only in the UI.
- Saving the whole set deletes saved rules that are no longer HCR-eligible,
  since the form only shows eligible entries. Per-rule edits keep them, flagged
  `eligible: false`.
