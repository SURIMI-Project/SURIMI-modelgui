# 0022 — Harvest control rule biomass is kg in the backend; tonnes only in the UI

**Status:** Accepted 2026-11-13
**Date:** 2026-11-13
**Related:** [features/harvest-control-rules](../features/harvest-control-rules/README.md), [features/experiments](../features/experiments/README.md), supersedes the unit of [0018](0018-harvest-control-rules-per-user-and-scenario.md) (its decisions 1, 3 and 4)

## Context

- The controller takes `TargetFishingMortality.biomass_limit` and
  `biomass_base` in kg; HCRs are shown in tonnes and multiplied by 1000 to
  send kg (**Confirmed by the controller team**, mail "Example Harvest Control rules",
  2026-10-16). His example file is in tonnes.
- The protocol bounds both biomass values to `(0, 3.3e12]` and `f_max` to
  `(0, 100]` (`buf.validate`, SURIMI-protocol `0c4b6c4`). **Read from source.**
- ADR 0018 stored and served tonnes and converted to kg only in
  `integrations/controller/mapping.py`. Showing tonnes is a display choice; the
  database, the API, Bruno and scripts then used a unit the controller does not.
- No frontend for HCRs exists yet (phase 10), and migrations 0004 to 0006 were
  not released, so changing the unit now touches only the backend.

## Decision

The database (`harvest_control_rules.biomass_limit_kg`, `biomass_base_kg`), the
REST API (`HcrIn`, `HcrUpdateIn`, `HcrOut`, `ExperimentIn.harvest_control_rules`)
and each experiment's stored `request` hold biomass in **kg**, with the bounds
of the protocol (`0 < limit ≤ 3.3e12`, `0 < base ≤ 3.3e12`, `0 < f_max ≤ 100`;
note 2026-11-18: this said `0 < limit < base`, but the protocol does not
compare the two, and since then the API does not either, see the
[harvest control rules README](../features/harvest-control-rules/README.md#how-the-fisheries-authority-uses-the-values)). Field names
end in `_kg`. `mapping.py` passes the values to the controller unchanged. The
seed (`surimi-backend seed-hcr`) keeps reading the controller team's tonnes CSV and multiplies
by 1000 in `hcr/seed.py` (the seed was removed on 2026-11-16 with the scenario
defaults, [ADR 0024](0024-harvest-control-rules-only-per-user-no-defaults.md):
the backend now converts no units). The phase 10 frontend shows and accepts tonnes
through one shared conversion helper and rounds what it displays.

## Why

- One unit from the database to the controller: no conversion in the backend
  path, and what an experiment stores is exactly what was sent.
- Units shown to people are a presentation concern; tonnes (or a unit picker
  later) change only the UI.
- API users (Bruno, scripts, the admin) see the controller's numbers.
- Cheapest now: no frontend code and no released migration depend on tonnes.

## Alternatives considered

| Option | Why not |
| --- | --- |
| Keep tonnes in the backend (ADR 0018) | A display choice baked into the API and database; a conversion in the backend path; the stored request differs from what was sent |
| Store kg, serve tonnes in the API | Two units inside the backend and a conversion in every schema |
| Let each client pick a unit (`?unit=t`) | More API surface for one consumer; the UI can convert |

## Consequences

- The API carries large numbers (`4000000.0`); the `_kg` suffix keeps the unit
  unmistakable.
- The frontend must convert in one helper and round when it divides by 1000.
- The seed was the only place that converted tonnes to kg (`KG_PER_TONNE`); since
  it was removed with the scenario defaults (ADR 0024, 2026-11-16) the backend
  converts no units at all.
- `GetInitialBiomasses` gives no unit: before the UI shows initial biomass
  next to HCR limits, its unit has to be confirmed (see [ISSUES.md](../ISSUES.md)).
- Migrations 0004 to 0006 were rebuilt as one revision,
  `0004_experiments_hcr_kg`; a database that ran the old ones is recreated
  (since 2026-11-16 the unreleased migrations 0004 to 0007 are one per feature: `0004_experiment_runs`, `0005_experiment_outputs`, `0006_species_catalog`, `0007_hcr_configurations`).
