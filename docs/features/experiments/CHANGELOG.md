# Experiments — changelog

Every change made for this feature, newest first. Each entry says what changed,
where, how it was checked and what deploying it needs. Design is in
[README.md](README.md).

---

## 2026-11-23 — Defaults in the form options; a snapshot of the initial HCR data per experiment

`GET …/experiment-options`: `initial_biomass` renamed `initial_biomass_kg`;
new `default_biomass_limit_kg`, `default_biomass_base_kg`, `default_f_max`
(null when none) and `initial_hcr_snapshot_id`; one `GetInitialHCRData` call
instead of two; the unit note is gone. `POST /experiments` and clone store
`initial_hcr_snapshot_id` (ADR 0028) or emit `experiment.initial_hcr_unavailable`
and still queue; `GET /api/v1/experiments/{id}/initial-hcr-data` (owner,
admin); the detail carries `initial_hcr_snapshot_id`. Migration
`0008_initial_hcr_snapshots` adds the column. Tests in
`tests/test_initial_hcr.py` and `tests/test_experiment_options.py`; 332 pass,
2026-11-23. Live against `project-surimi` (queued only). Design:
[harvest control rules § Initial HCR data](../harvest-control-rules/README.md#initial-hcr-data).

---

## 2026-11-16 — HCR configurations; every contract species in the options

**Status:** built. Ruff, format, mypy strict clean; **286 tests pass, all integration tests included** (PostgreSQL 17 in Docker), 2026-11-16.

- `experiments/schemas.py`: `ExperimentIn.hcr_configuration_id`;
  `SpeciesOptionOut` (was `HcrOptionOut`, now with `hcr_eligible`, without
  `rule`); `HcrConfigurationSummaryOut`; `ExperimentOptionsOut.species`
  (every contract entry, asked by the user 2026-11-16: "the contract provides
  other fishes also") replaces `hcr`, and `hcr_configurations` is added.
- `experiments/service.py`: rules from `harvest_control_rules` or
  `hcr_configuration_id` (copied, with `hcr_configuration_id` and
  `hcr_configuration_name` in the stored request; someone else's is a 404), not
  both (422); neither: none (`harvest_control_rules_source` `none`). Uses
  `hcr.validate_rules`.
- `experiments/options.py`: every contract species; initial biomass and F
  null for an entry the controller has no value for (`SWO`, `VMA` in
  `northwestern_med`), instead of an F of 0.
- Tests: `tests/test_experiments.py` (`test_a_saved_configuration_is_used_by_id`),
  `tests/test_experiment_options.py` (92 contract entries, `ANE adult` not
  eligible with F 4.225, `SWO` without values, configurations listed per
  scenario).
- Why: [ADR 0025](../../decisions/0025-several-named-hcr-configurations-per-scenario-in-jsonb.md).
  Bruno: `get experiment options.yml`, `post experiment.yml`.

---

## 2026-11-16 — Saved rules only; no scenario defaults

**Status:** built. Ruff, format, mypy strict clean; **286 tests pass, all integration tests included** (PostgreSQL 17 in Docker), 2026-11-16.

- `experiments/service.py`: without `harvest_control_rules` an experiment
  takes the user's saved rules for the scenario, none when they saved none
  (`hcr.saved_rules`); `harvest_control_rules_source` is `own` or `request`.
- `experiments/options.py`, `experiments/schemas.py`: `rules_source` removed
  from `GET /api/v1/scenarios/{name}/experiment-options`; `rule` is the
  user's saved rule or null.
- Why: [ADR 0024](../../decisions/0024-harvest-control-rules-only-per-user-no-defaults.md)
  (user, 2026-11-16). Bruno: `get experiment options.yml`, `post experiment.yml`.

---

## 2026-11-16 — Experiment form options; console experiment tab

**Status:** built. Ruff, format, mypy strict clean; **287 tests pass, all integration tests included** (PostgreSQL 17 in Docker), 2026-11-16. The console tab was **not opened in a browser**.

Asked by the user, 2026-11-16: choose a scenario in the console and configure
it (dates, climate, MSE, HCRs with biomass limit, base and fishing mortality),
with an endpoint that brings the controller's data.

- `GET /api/v1/scenarios/{name}/experiment-options`
  (`experiments/options.py` new, `experiments/router.py` `scenario_router`,
  `experiments/schemas.py` `ExperimentOptionsOut`, `HcrOptionOut`,
  `HcrRuleValues`, `main.py`): contract dates, climate scenarios, pods, and per
  HCR-eligible entry its names, group, rule and initial biomass and F. A
  controller failure on the initial values becomes a note.
  `experiments/service.py`: `_parse_ts` made public as `parse_timestamp`.
- `tests/test_experiment_options.py` (new): NW Med (dates, climate, pods 1 and
  5, the six HCR rows, BFT initial biomass 54,016.12 and F 2.082, group name),
  a saved rule offered with `rules_source = own`, `aegean_sea` without initial
  values or HCR species, 404 and 401.
- Console tab **New experiment**: see the
  [backend-console CHANGELOG](../backend-console/CHANGELOG.md).
- Bruno: `api/experiments/get experiment options.yml`.

---

## 2026-11-13 — Harvest control rules in kg; migrations rebuilt

- `ExperimentIn.harvest_control_rules[]` and the stored `request` carry
  `biomass_limit_kg` and `biomass_base_kg` instead of `_t`
  ([ADR 0022](../../decisions/0022-hcr-biomass-in-kg-tonnes-only-in-the-ui.md)).
  `integrations/controller/mapping.py` no longer multiplies by 1000 (and
  `KG_PER_TONNE` moved to `hcr/seed.py`). Files: `experiments/schemas.py`
  (description, example), `experiments/service.py`, `experiments/models.py`
  (comment), `integrations/controller/base.py` (docstring).
- Migrations `0004` to `0006` replaced by `0004_experiments_hcr_kg`; details
  and checks in the [harvest-control-rules
  CHANGELOG](../harvest-control-rules/CHANGELOG.md), 2026-11-13.
- Tests: `tests/test_experiments.py` (stored request in kg),
  `tests/test_fake_controller.py` (`test_mapping_passes_kg_through_with_the_contract_spelling`).
- Documented under validation: an empty `climate_scenario` for `aegean_sea` is
  accepted although the proto says `min_len: 1` (**Read from source**,
  SURIMI-controller `117e604`); open item in [ISSUES.md](../../ISSUES.md).
- **Verified** 2026-11-13: Ruff, format, mypy strict clean; 239 tests pass.

---

## 2026-11-13 — `initialised`, `simulation_counts`, progress per simulation

- New status `initialised`: every simulation of the experiment is Initialised
  and waits for the controller to start them together. It can be cancelled
  like `initialising`: the worker repeats `RemoveExperiment` once the
  simulations run.
- `ExperimentOut.simulation_counts` (for example `{"initialising": 3,
  "initialised": 2}`); `SimulationOut.progress`. `pods_required` is documented
  as the number of simulations too. Files: `experiments/schemas.py`,
  `experiments/service.py`, `experiments/repository.py`.
- Design and tests: [simulation-status-scheduler
  CHANGELOG](../simulation-status-scheduler/CHANGELOG.md), 2026-11-13.
- **Verified** 2026-11-13: Ruff, format, mypy strict clean; 239 tests pass (integration tests on PostgreSQL 17 in Docker).

---

## 2026-11-12 — Statuses `copying_results` and `completed`; HCR bounds

**Status:** built (backend).

- `finished` is now `completed`, reached only when the results are in the
  bucket and indexed; before that the experiment is `copying_results`
  ([scheduler changelog](../simulation-status-scheduler/CHANGELOG.md)).
  `ExperimentOut` has a new `completed_at`. Cancel of a `copying_results`
  run → 409. Migration `0005_results_and_hcr_bounds`.
- HCRs in a request must also meet the controller's bounds (biomass at most
  3.3e9 t, `f_max` at most 100), see the
  [harvest control rules changelog](../harvest-control-rules/CHANGELOG.md).
- **Verified** 2026-11-12: 235 tests pass (`tests/test_experiments.py`).

---

## 2026-11-06 — Submit, list, detail, cancel, clone, delete, adopt

**Status:** built (plan 2026-11-05 step 4c, with phase 5's queue). Ruff, Ruff format and mypy strict clean; 229 tests pass, of them 61 new (integration tests against PostgreSQL 17 in Docker).
`tests/test_experiments.py`: validation listing every problem (dates against
the contract, climate scenario required for NW Med and refused for
`aegean_sea`, HCR eligibility, duplicate rules); a run from `queued` to
`finished` on the fake controller with the HCRs sent in kg and kept in
tonnes; members see only their own (404 for others), admins see all and
filter by owner and name; cancel while queued, initialising and running;
soft delete; clone; saved rules used when the request has none.
**Verified** 2026-11-06 against `user-<developer>` through nginx (the
plan's step 4c exit): experiment `5067d5f7…`, `northwestern_med`, HKE adult
and PIL adult rules, end 2014-01, `RCP_4.5`, queued 18:43, submitted the
same second, `Initialised` 18:47, running 18:48 to 18:53 (one model month
about every 15 s), `finished`; outputs indexed from the bucket at 18:55
(19.8 MB, 13 months). Events: queued, submitted, three status changes,
outputs_ready. During the run the leading worker was stopped and the standby
took over after about 6 s; progress kept being recorded.

`apps/backend/…`:

- `src/surimi_backend/experiments/` (`models.py`, `schemas.py`,
  `repository.py`, `service.py`, `router.py`, `events.py`, `queue.py`): new.
- `src/surimi_backend/integrations/controller/`: `SubmitExperiment` and
  `RemoveExperiment` in the protocol, the gRPC client (never retried) and the
  fake; `mapping.py` turns tonnes into kg; the fake runs experiments on a
  timeline and copies the controller's pod rules.
- `src/surimi_backend/catalog/service.py`: cached protocol version.
- Migration `0004_experiments`: `experiments`, `simulations`,
  `experiment_events`, `app_settings`.

**Not built:** a separate `GET /admin/experiments/unmanaged` (the admin queue
view lists unmanaged experiments that hold pods); purge of soft-deleted
experiments after 12 months (phase 7).
