# 0018 — Harvest control rules are stored per user and scenario in tonnes, and copied into each experiment

**Status:** Proposed; the unit (tonnes, decisions 1, 3 and 4) superseded by [0022](0022-hcr-biomass-in-kg-tonnes-only-in-the-ui.md); the scenario defaults (decision 1's null owner, decision 2, the defaults in decision 4) superseded by [0024](0024-harvest-control-rules-only-per-user-no-defaults.md); the storage (decision 1, one row per rule, one set per scenario) superseded by [0025](0025-several-named-hcr-configurations-per-scenario-in-jsonb.md)
**Date:** 2026-11-05
**Related:** [plan 2026-11-05](../plans/2026-11-05-scenario-catalog-hcr-experiments.md), [features/harvest-control-rules](../features/harvest-control-rules/README.md), [features/experiments](../features/experiments/README.md), [0017](0017-scenario-catalog-from-partner-config.md)

## Context

- The controller team, mail "Example Harvest Control rules", 2026-10-16 (**Confirmed by
  the controller team**): HCRs are stored in the model GUI database; people change, add and
  delete them; not every species needs one; biomass limit and biomass base are
  shown in tonnes and must be multiplied by 1000 to send kg; storing them with
  scenario name and username is up to us. Example file columns:
  `species_code, Biomass Limit, Biomass Base, F max`.
- The controller takes them per experiment as
  `regulations_definitions_summary.target_fishing_mortalities[]`
  (`species`, `biomass_limit`, `biomass_base`, `f_max`). **Read from source.**
- Only some species of some scenarios can carry an HCR
  ([ADR 0017](0017-scenario-catalog-from-partner-config.md)).
- An experiment's inputs must stay as they were sent, for clone and audit
  ([features/experiments](../features/experiments/README.md)).

## Decision

1. Table `harvest_control_rules`: `owner_id` (null = scenario default),
   `scenario_name`, `species_code`, `life_stage` (empty string when none),
   `biomass_limit_t`, `biomass_base_t` (`numeric`, tonnes), `f_max`
   (`numeric`), timestamps. Unique on
   `(owner_id, scenario_name, species_code, life_stage)` with `NULLS NOT DISTINCT`.
2. A user's rules for a scenario are their own rows; when they have none, the
   scenario defaults are shown and used. "Reset to defaults" deletes their
   rows. Admins manage the defaults, seeded from a CSV in the repo in the controller team's
   format.
3. The API and database use tonnes. `integrations/controller/mapping.py` is
   the only place that multiplies by 1000.
4. `POST /experiments` takes `harvest_control_rules[]`; if omitted, the user's
   current rules (or the defaults) are used. The rules sent are stored in the
   experiment's `request` `jsonb`, in tonnes, so later edits do not change
   past experiments.
5. Validation: entry is HCR-eligible in the catalog; `0 < biomass_limit_t <
   biomass_base_t`; `f_max > 0`; one rule per species and life stage.

## Why

- Follows the controller team's description; per user and scenario is the natural key he
  suggested.
- Tonnes everywhere except the wire keeps one conversion point, so a ×1000
  bug can only be in one function and one test.
- Defaults let a new user submit at once; own rows let them experiment
  without affecting others.
- Copying into the experiment makes clone and audit exact.

## Alternatives considered

| Option | Why not |
| --- | --- |
| Store kg | The UI and the controller team's file think in tonnes; every read would divide; values like 7742990 are harder to check by eye |
| Named rule sets per user (several sets per scenario) | Not asked for; can be added later by a `set_id` column without breaking this |
| Experiment references the saved rules instead of copying | Editing a rule would rewrite history of past experiments |
| HCRs only inside the experiment request, no saved rules | The controller team and the user want rules users keep and edit |

## Consequences

- One more table and migration, one more router.
- When eligibility changes upstream, saved rules may become invalid; they are
  kept but flagged `eligible: false` in the API and refused at submit.
- Clone takes the HCRs of the source experiment, not the user's current ones.
