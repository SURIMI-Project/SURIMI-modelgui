# 0025 — Several named HCR configurations per user and scenario, their rules in a jsonb column

**Status:** Accepted 2026-11-16 (user)
**Date:** 2026-11-16
**Related:** [features/harvest-control-rules](../features/harvest-control-rules/README.md), [features/experiments](../features/experiments/README.md), supersedes the storage of [0018](0018-harvest-control-rules-per-user-and-scenario.md) (decision 1, one row per rule) and the single set per scenario of [0024](0024-harvest-control-rules-only-per-user-no-defaults.md) (decisions 3 to 5)

## Context

- Until now a user had one set of rules per scenario (table
  `harvest_control_rules`, one row per rule; `PUT …/hcr` replaced the set).
  ADR 0018 named "several named rule sets" as a later extension.
- The user, 2026-11-16: users must be able to keep several configurations per
  scenario; the rules should be stored in a JSON column.
- A set has few rules (6 HCR-eligible entries in `northwestern_med`, none in
  the other two scenarios today) and is always read and written as a whole:
  by the experiment form, and copied into an experiment's request. Nothing
  queries single rules. **Read from source.**
- Experiments already store the rules they were sent with as `jsonb` in
  `experiments.request`.

## Decision

1. Table `hcr_configurations`: `id`, `owner_id` (NOT NULL, cascade),
   `scenario_name`, `name`, `rules` (`jsonb` array of
   `{species_code, life_stage, biomass_limit_kg, biomass_base_kg, f_max}`,
   the contract's spelling), timestamps. Unique
   `(owner_id, scenario_name, lower(name))`; checks `jsonb_typeof(rules) =
   'array'` and a name of 1 to 100 characters. At most 50 per user and
   scenario.
2. Migration `0007_hcr_configurations` creates the table. As none of the
   migrations since 0004 was released, they are rebuilt one per feature
   (2026-11-16) and `harvest_control_rules` never exists in the new chain; no
   rules are moved.
3. API `/api/v1/scenarios/{name}/hcr-configurations`: `GET` (list with the
   rules), `POST`, `GET /{id}`, `PUT /{id}` (rename and replace the whole set,
   all or nothing), `DELETE /{id}`. The per-rule routes and `PUT …/hcr` are
   removed.
4. `POST /experiments` takes `harvest_control_rules` (as given) or
   `hcr_configuration_id` (its rules are copied into the request, with the
   configuration's id and name), not both; with neither the experiment has no
   rules.
5. `GET …/experiment-options` lists the user's configurations (id, name,
   rule count) instead of one saved rule per entry.

## Why

- The user asked for several configurations per scenario and for a JSON
  column.
- A `jsonb` array matches how the rules are used, as one value: a save is one
  `UPDATE`, a read needs no join, and the stored form is the same as in an
  experiment's request. `jsonb` is core PostgreSQL, no extension (ADR 0014).
- Every write goes through the API, whose request models check each rule's
  bounds (`0 < limit ≤ 3.3e12`, `0 < base ≤ 3.3e12`, `0 < f_max ≤ 100`; the
  limit and the base are not compared since 2026-11-18, see the
  [harvest control rules README](../features/harvest-control-rules/README.md#how-the-fisheries-authority-uses-the-values)), eligibility and
  uniqueness before saving, so the database checks lost with the per-rule
  columns had no other writer to guard against.

## Alternatives considered

| Option | Why not |
| --- | --- |
| A `hcr_configurations` table plus a child table with one row per rule | Keeps per-rule checks in the database, but adds a join and a delete-and-insert on every save for data that is only ever handled as a whole; the user preferred jsonb |
| A `set_name` column on `harvest_control_rules` (ADR 0018's suggestion) | A configuration with no rules could not exist, and a rename would update every row |
| Keep the per-rule routes inside a configuration | No client edits one rule at a time; more routes to secure and test |
| Experiments reference the configuration instead of copying its rules | Editing a configuration would rewrite past experiments (ADR 0018) |

## Consequences

- The database no longer checks a rule's bounds or that an entry appears only
  once in a configuration; the API is the only check, and it must stay the
  only writer.
- Finding which configurations use a species code needs
  `jsonb_array_elements` (the species import's `replace` protection does
  this).
- The migration's downgrade drops the table and every configuration.
- A configuration may hold a rule that is no longer HCR-eligible; it is
  flagged `eligible: false`, refused when the configuration is used for an
  experiment, and must be removed before the configuration can be saved
  again.
