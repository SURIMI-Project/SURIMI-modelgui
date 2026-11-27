# Harvest control rules — changelog

Every change made for this feature, newest first. Each entry says what changed,
where, how it was checked and what deploying it needs. Design is in
[README.md](README.md).

---

## 2026-11-27 — Rules on functional groups; entries carry `kind` and `members`

`initial_hcr/schemas.py`, `initial_hcr/service.py`, `hcr/schemas.py`,
`hcr/service.py`: initial HCR data entries and configuration rules carry
`kind` and `members` (ADR 0029); for a functional group `species_name` is
the group's name. `functional_group` and `functional_group_name` are
deprecated and null. `aegean_sea`'s 7 group codes are HCR-eligible, so a rule
can be saved on `DF2` and is sent with `species_code = "DF2"`, as
`GetInitialHCRData` names it. Validation is unchanged. **Verified** by the
test suite (349 pass, see the scenario catalog changelog); not run against
`project-surimi`.

---

## 2026-11-23 — Built: initial HCR data and defaults from the controller, snapshots per experiment

**Status:** built (backend, console, Bruno); plan 2026-11-23 phase 1. Ruff, format and mypy strict clean; **332 tests pass**, integration tests included (PostgreSQL 17), 2026-11-23.

- **Protocol.** `packages/proto` re-pinned to `6b2079ac565b4f598d218d3a73e1b5d7`
  (SURIMI-protocol `7d0953e`) and regenerated: `get_initial_hcr_data`,
  `initial_hcr_data` added, `get_initial_biomasses` and
  `get_initial_fishing_mortalities` gone. The only other change since
  `250f617` is a comment in `regulation_definition.proto`.
- **Controller client** (`integrations/controller/`): `get_initial_hcr_data`
  → `InitialHcrData` (kg, values as sent) replaces the two old methods and
  `SpeciesValue`, in the protocol, the gRPC client and the fake. The fake
  serves a copy of `northwestern_med_initial_hrc_data.csv` (SURIMI-Ecopath
  `3819d2c`, `fake_initial_state/northwestern_med/`; the old two CSVs removed)
  and fails other scenarios as `project-surimi` does; tests can override it.
- **New `initial_hcr/` area**: `InitialHcrSnapshot`, `record` (canonical JSON,
  SHA-256, `INSERT … ON CONFLICT DO NOTHING RETURNING`), `live`, `capture`,
  `history`, `snapshot_out`, `for_experiment`; routes
  `GET /api/v1/scenarios/{name}/initial-hcr-data`, `/history`,
  `/history/{snapshot_id}`. Migration `0008_initial_hcr_snapshots`.
- **Catalog**: `scenario_catalog.name_entries` and `CatalogService.name_entries`
  name any entry (species table) and give its group and eligibility;
  `initial_hcr_data`, `require_scenario`. `/initial-biomasses` and
  `/initial-fishing-mortalities` removed with their schemas.
- **Experiments**: the options carry `initial_biomass_kg` (renamed),
  `default_*` and `initial_hcr_snapshot_id`, from one controller call
  (two before), recorded as a snapshot; `POST /experiments` (and clone)
  stores the snapshot id, or emits `experiment.initial_hcr_unavailable`;
  `GET /api/v1/experiments/{id}/initial-hcr-data`; the detail has
  `initial_hcr_snapshot_id`.
- **Console**: a newly added species starts from its default rule, shown
  under each input, with "Reset to default"; initial biomass in tonnes.
- **Tests**: new `tests/test_initial_hcr.py` (7 integration tests);
  `test_grpc_client.py`, `test_catalog.py`, `test_scenario_catalog.py`,
  `test_experiment_options.py`, `test_database.py`, `conftest.py` updated.
- **Bruno**: `controller/GetInitialHCRData.yml`; `api/initial-hcr-data/`
  (`get initial hcr data`, `get initial hcr history`, `get initial hcr
  snapshot`); `api/experiments/get experiment initial hcr data.yml`;
  `get experiment options` docs; `initialHcrSnapshotId` in the four
  environments with an `apiUrl`. Removed: `controller/GetInitialBiomasses.yml`,
  `GetInitialFishingMortalities.yml`, the misnamed untracked
  `GetInitialHarvestControlRules.yml`, `api/get initial biomasses.yml`,
  `api/get initial fishing mortalities.yml`.

A rule's `changed_from_default` uses a 1e-6 relative tolerance: the console
shows a default in tonnes rounded to 6 decimals, and an unchanged default sent
back differs from it by about 3e-9 (computed for HKE adult); a 1e-9 tolerance
would have marked it changed.

**Verified** 2026-11-23:
- The gate above.
- Migration 0008 on a throwaway PostgreSQL 17: upgrade, downgrade to 0007 and
  upgrade again, `pg_dump --schema-only` identical; the models match the
  migrated schema except the existing `species_search_idx` expression index,
  which Alembic cannot compare.
- Live against `project-surimi` (real app and gRPC client, throwaway database,
  read-only controller calls): `northwestern_med` 91 entries, 6 eligible, the
  same snapshot on a second call, HKE adult named "European hake" /
  *Merluccius merluccius* / "Adult hake" with default 15,983 / 63,934 kg and
  F max 0.2352; `anchovy_bay` and `aegean_sea` 502 (no file); history one
  snapshot; experiment options with defaults and the same snapshot id; an
  experiment queued (no worker ran, nothing submitted) pointing to it, a rule
  at its default `changed_from_default: false`, another `true`. `LXQ` and `SOO`
  have no English name in ASFIS (scientific name served).

**Not verified:** the console in a browser (`node --check` only); the Bruno
requests in Bruno itself (the same endpoints were called by the live script);
an experiment with rules run to the end (plan phase 2).

**Deploying:** migration `0008_initial_hcr_snapshots`; a controller with
`GetInitialHCRData` and the scenario files in its bucket (docs/CHANGELOG.md).

---

## 2026-11-23 — Plan: initial values and default rules from `GetInitialHCRData`

**Status:** planned, no code changed. The project agreed that the controller
provides default HCRs (**Confirmed by the controller team, 2026-11-20**); the
protocol replaced `GetInitialBiomasses` and `GetInitialFishingMortalities` with
`GetInitialHCRData` (SURIMI-protocol `7d0953e`, 2026-11-23).

- New: [plan 2026-11-23](../../plans/2026-11-23-hcr-initial-data-from-controller.md),
  [ADR 0027](../../decisions/0027-hcr-initial-data-and-defaults-from-the-controller.md)
  and [ADR 0028](../../decisions/0028-initial-hcr-data-snapshots-per-experiment.md),
  all accepted by the user the same day. 0028 adds a snapshot of the initial
  HCR data per experiment, at the user's request. ADR 0024's decision 3 (empty
  fields) is superseded by 0027.
- The user decided that nothing waits on partner answers: the plan's open
  questions became recorded data concerns in `ISSUES.md`.
- The plan adds species names (user): every entry, live or from a snapshot,
  is named from the `species` table and grouped from the catalog when read;
  snapshots keep codes only. **Verified** 2026-11-23: all 86 codes in the NW
  Med file have an ASFIS row.
- README: the proposed change noted under "No defaults"; "an experiment may run
  with no HCR" recorded as confirmed and removed from the open questions (also
  in `features/experiments`, `ISSUES.md` and plan 2026-11-05).
- `ISSUES.md`: the initial values item rewritten as "`GetInitialHCRData`:
  values look wrong in size, two scenarios missing".

**Verified** 2026-11-23: `GetInitialHCRData` on `project-surimi` answers 91
entries for `northwestern_med` and `INTERNAL` (file missing) for `anchovy_bay`
and `aegean_sea`; `user-<developer>` answers `UNIMPLEMENTED`. **Read from
source:** SURIMI-controller `782b979`, SURIMI-Ecopath `3819d2c`,
SURIMI-fisheries-authority `37b68bb`.

---

## 2026-11-18 — A biomass limit at or above the base is accepted

**Status:** built (backend and console). Ruff, format, mypy strict clean;
**325 tests pass, integration tests included** (PostgreSQL 17), 2026-11-18,
on a branch from `develop` (`d709998`). **Not run** on the compose stack; the
console note **not seen in a browser**.

Asked by the user, 2026-11-18: allow a limit that passes the base, and record
what it means. Before, the API refused `biomass_limit_kg >= biomass_base_kg`
as one of "the protocol's bounds"; the protocol has no such rule (only
per-field bounds, SURIMI-protocol `250f617`). Read from source what the
models do with it: the controller passes the values on unchanged, the
fisheries authority hands them to EwE's `cMSEQuotaCalculator`, which with
`Bbase ≤ Blim` uses a range of 1e-20, so F is `f_max` above the limit and 0
at or below it. The README's new section "How the fisheries authority uses the
values" has the formula, the commits and the `project-surimi` image versions
(service-playground `Surimi` `41d617b`; fisheries authority built from
`a68715a` with EwECore 6.7.130 = Eii.Ecopath `3faddf1`).

`apps/backend/`:

- `src/surimi_backend/hcr/schemas.py`: `_limit_below_base` removed (with the
  unused `model_validator` and `Self` imports); the base's description says
  what a base at or below the limit does; the comment cites SURIMI-protocol
  `250f617` instead of `0c4b6c4`.
- `src/surimi_backend/hcr/router.py`: the 422 description no longer lists
  "limit not below base".
- `tests/test_hcr.py`: the limit-above-base case left the 422 list, a zero
  limit joined it; new `test_a_limit_at_or_above_the_base_is_accepted` saves
  a limit above and one equal to the base and reads them back.
- `src/surimi_backend/console/static/app.js`: see the backend console
  changelog.

Docs: this README (Decisions, new section, status, how to test, phase 10
row), `docs/ARCHITECTURE.md` (how an HCR becomes a TAC: the formula, the
open question answered), `docs/ISSUES.md` (question on `UpdateQuotas`
removed), `docs/features/experiments/README.md` (validation rules), ADR 0022
and 0025 (the bounds they quote, with a dated note), Bruno
`api/hcr-configurations/post hcr configuration.yml`, `docs/CHANGELOG.md`.

No migration: the rules are `jsonb` and the database never compared the two.

---

## 2026-11-16 — Several named configurations per scenario, rules in jsonb

**Status:** built (backend and console). Ruff, format, mypy strict clean; **286 tests pass, all integration tests included** (PostgreSQL 17 in Docker), 2026-11-16. Migration
`0007_hcr_configurations` **Verified** on a throwaway PostgreSQL 17: one
user's rules of two scenarios became two "My rules" configurations with their
rules as `jsonb`, `harvest_control_rules` dropped, a `rules` that is not an
array refused, downgrade restores the rows, upgrade again works;
`alembic check` finds nothing for the new table. **Not run** on the compose
stack; the console **not used in a browser**.

Asked by the user, 2026-11-16: several configurations per scenario, the rules
in a JSON column. [ADR 0025](../../decisions/0025-several-named-hcr-configurations-per-scenario-in-jsonb.md)
(accepted) supersedes the storage of ADR 0018 and the single set of ADR 0024.

`apps/backend/`:

- `src/surimi_backend/hcr/models.py`: `HcrConfiguration` (`hcr_configurations`:
  owner, scenario, name, `rules` jsonb) replaces `HarvestControlRule`.
- `src/surimi_backend/migrations/versions/20261116_0007_hcr_configurations.py`
  (new): the table, index `hcr_configurations_name_uq`, checks; rules moved;
  old table dropped.
- `src/surimi_backend/hcr/schemas.py`: `HcrConfigurationIn` (name trimmed,
  1 to 100), `HcrConfigurationOut`, `HcrConfigurationListOut`, `HcrRuleOut`,
  `MAX_CONFIGURATIONS` = 50; `HcrUpdateIn`, `HcrSetIn`, `HcrListOut`, `HcrOut`
  removed.
- `src/surimi_backend/hcr/service.py`: `validate_rules()` (used by experiments
  too), `create`, `replace`, `remove`, `get_configuration`,
  `configurations_of`, `list_configurations`; 409 for a taken name (from the
  unique index) or the 50th.
- `src/surimi_backend/hcr/router.py`: `/api/v1/scenarios/{name}/hcr-configurations`
  (`GET`, `POST`, `GET /{id}`, `PUT /{id}`, `DELETE /{id}`); `/hcr` routes removed.
- `src/surimi_backend/catalog/species_import.py`: codes in use read with
  `jsonb_array_elements`.
- `src/surimi_backend/models.py`, `tests/conftest.py`, `tests/test_database.py`:
  the new table.
- Tests: `tests/test_hcr.py` rewritten (see the README's How to test).

Elsewhere: experiments ([experiments CHANGELOG](../experiments/CHANGELOG.md)),
the console ([backend-console CHANGELOG](../backend-console/CHANGELOG.md)),
Bruno (`api/hcr-configurations/*` replaces `api/hcr/*`; environment variable
`hcrConfigurationId` replaces `ruleId`).

**Deploy:** rebuild the images, then `surimi-backend migrate` (compose's
migrate job).

Later the same day the unreleased migrations were rebuilt one per feature
([backend-skeleton CHANGELOG](../backend-skeleton/CHANGELOG.md)): `0007_hcr_configurations`
now only creates `hcr_configurations`; `harvest_control_rules` and the move of
its rows into "My rules" are gone from the chain.

---

## 2026-11-16 — No scenario defaults; save a whole set per scenario

**Status:** built (backend and console). Ruff, format, mypy strict clean; **286 tests pass, all integration tests included** (PostgreSQL 17 in Docker), 2026-11-16. Migration
`0006_hcr_owner_required` **Verified** on a throwaway PostgreSQL 17: a
default row deleted and an owned row kept, `owner_id` NOT NULL, the index
rebuilt without `NULLS NOT DISTINCT`; downgrade restores both, upgrade again
works; `alembic check` finds nothing for this table (it reports only the
`species_search_idx` expression index from 0005, an Alembic false positive
for expression indexes). **Not run** on the compose stack; the console's save
button **not used in a browser**.

Asked by the user, 2026-11-16: the initial biomass and fishing mortality come
from the controller; admins will not save defaults; users save their own
preconfigured biomass and fishing mortality per scenario.
[ADR 0024](../../decisions/0024-harvest-control-rules-only-per-user-no-defaults.md)
(accepted) supersedes the defaults of ADR 0018.

`apps/backend/`:

- `src/surimi_backend/hcr/models.py`: `owner_id` not nullable; the unique index
  without `postgresql_nulls_not_distinct`.
- `src/surimi_backend/migrations/versions/20261116_0006_hcr_owner_required.py`
  (new, revision `0006_hcr_owner_required`): deletes the rows with no owner,
  sets NOT NULL, rebuilds `harvest_control_rules_entry_uq`.
- `src/surimi_backend/hcr/schemas.py`: `HcrSetIn` (`rules`, at most
  `MAX_RULES` = 200); `HcrListOut` loses `source`.
- `src/surimi_backend/hcr/service.py`: `replace()` (whole set, one
  transaction, all or nothing, every problem listed; logs `hcr.saved`);
  `effective_rules()` becomes `saved_rules()`; `reset()`, `count_defaults()`
  and the `hcr_default.*` audit events removed; no `actor_id`.
- `src/surimi_backend/hcr/router.py`: `PUT /api/v1/scenarios/{name}/hcr`
  added; `POST …/hcr/reset` and `admin_router`
  (`/api/v1/admin/scenarios/{name}/hcr-defaults`) removed. `main.py` no
  longer registers the admin router.
- Removed: `src/surimi_backend/hcr/seed.py`,
  `catalog/data/northwestern_med_hcr_defaults.csv`,
  `catalog/data/anchovy_bay_hcr_defaults.csv`, and `surimi-backend seed-hcr`
  (`cli.py`).
- `experiments/service.py`, `experiments/options.py`, `experiments/schemas.py`:
  saved rules only; `rules_source` removed from the options.
- `catalog/species_import.py` (docstring), `scripts/build_species_csv.py` and
  `tests/test_species.py` no longer read the defaults CSVs (`species.csv`
  unchanged: it holds the whole ASFIS list).
- Tests: `tests/test_hcr.py` rewritten (no rules before saving; whole-set save
  replaces, per scenario and per user, `[]` deletes; all or nothing with
  every problem listed; no admin routes; `owner_id` NOT NULL); seed tests and
  `tests/test_cli.py::test_seed_hcr_runs_in_a_fresh_process` removed;
  `tests/test_experiment_options.py` without `rules_source`.

Elsewhere: `deployments/compose.yml` (the migrate job no longer runs
`seed-hcr`), the console's **Save as my rules**
([backend-console CHANGELOG](../backend-console/CHANGELOG.md)), Bruno
(`api/hcr/put hcr.yml` new; `post hcr reset.yml` and `api/admin/hcr-defaults/`
removed).

The open question "HCR values for all species of the three case studies"
(asked by the project) is removed here and from ISSUES.md: it was needed only for
the defaults.

**Deploy:** rebuild the images, then `surimi-backend migrate` (compose's
migrate job). It deletes the default rows (the `BFT` row from the controller team's example).

---

## 2026-11-13 — Biomass in kg; migrations rebuilt

**Status:** built (backend).

- [ADR 0022](../../decisions/0022-hcr-biomass-in-kg-tonnes-only-in-the-ui.md)
  (accepted by the user 2026-11-13) replaces the unit of ADR 0018: the
  database, the API and each experiment's stored request hold biomass in kg;
  tonnes only in the phase 10 UI.
- API: `biomass_limit_t`, `biomass_base_t` → `biomass_limit_kg`,
  `biomass_base_kg` in `HcrIn`, `HcrUpdateIn`, `HcrOut`
  (`hcr/schemas.py`, `MAX_BIOMASS_KG = 3.3e12`), `hcr/service.py` (also the
  audit details), `hcr/router.py` (summary).
- Database: columns `biomass_limit_kg`, `biomass_base_kg`; check
  `biomass_limit_kg > 0 AND biomass_limit_kg < biomass_base_kg AND
  biomass_base_kg <= 3300000000000` (`hcr/models.py`).
- `hcr/seed.py`: the controller team's CSV stays in tonnes; `parse()` multiplies by
  `KG_PER_TONNE` (1000), the only conversion left in the backend.
- Migrations `0004_experiments`, `0005_results_and_hcr_bounds` and
  `0006_initialised` (none released) are replaced by one,
  `20261113_0004_experiments_hcr_kg.py` (revision `0004_experiments_hcr_kg`),
  which creates their end state directly. A new revision id, so a database
  that ran the old ones stops with "Can't locate revision" instead of
  silently keeping tonne columns.
- Tests: `tests/test_hcr.py` (kg values, 3.4e12 → 422, seed rows in kg),
  `tests/world.py`.
- **Verified** 2026-11-13: the old chain and the new migration applied to two
  empty PostgreSQL 17 databases; `pg_dump --schema-only` differs only in the
  two kg columns, the kg check and the position of `experiments.completed_at`
  (now next to `finished_at`); enum `experiment_status` identical;
  `alembic check` finds no difference between the models and the new schema;
  downgrade to `0003_user_names` and upgrade again work. Ruff, format, mypy
  strict clean; 239 tests pass (integration included, Docker).
- Found while checking: the controller does not enforce the `buf.validate`
  bounds on `SubmitExperiment` (SURIMI-controller `117e604`: no validation
  interceptor; only `scenario_name` is checked), so our checks are the only
  ones. **Read from source.**
- Deploy: recreate the database (or drop its tables of migration 0004 onward
  and the `alembic_version` row back to `0003_user_names`), then
  `surimi-backend migrate` and `seed-hcr`. See [docs/CHANGELOG.md](../../CHANGELOG.md).

---

## 2026-11-12 — The controller's bounds

**Status:** built (backend).

- `hcr/schemas.py`: `MAX_BIOMASS_T = 3.3e9` and `MAX_F = 100`, from the
  controller's `buf.validate` rules (SURIMI-protocol `0c4b6c4`: biomass in
  (0, 3.3e12] kg, `f_max` in (0, 100]). `HcrIn`, `HcrUpdateIn` and the rules in
  `POST /experiments` refuse values above them (422).
- `hcr/seed.py`: seed rows outside the bounds are reported, not loaded.
- `hcr/models.py` and migration `0005_results_and_hcr_bounds`: checks
  `harvest_control_rules_limits_ck` (… `AND biomass_base_t <= 3300000000`) and
  `harvest_control_rules_f_max_ck` (`f_max > 0 AND f_max <= 100`).
- The open question "allowed range of `f_max`" is answered by the protocol and
  removed.
- Tests: `tests/test_hcr.py` (`f_max` 100.5 and `biomass_base_t` 3.4e9 → 422;
  a seed row with `f_max` 101 reported).
- **Verified** 2026-11-12: Ruff, format, mypy strict clean; 235 tests pass;
  the two checks seen in `pg_constraint` after migrating down to `0004` and up.
- Deploy: `surimi-backend migrate`. It fails if a saved rule is outside the
  bounds (none are expected: the defaults are far below).

---

## 2026-11-06 — Rules per user and scenario, defaults, seed

**Status:** built (plan 2026-11-05 step 4b). Ruff, Ruff format and mypy strict clean; 229 tests pass, of them 61 new (integration tests against PostgreSQL 17 in Docker). `tests/test_hcr.py`:
owner-only CRUD (someone else's rule is 404), the eligibility 422 naming
`BFT, BOG, HKE adult, HKE juvenile, MUT adult, PIL adult`, limit not below
base 422, duplicate 409 (life stage compared without case), reset, admin
defaults with audit events, the controller team's file format (CRLF, spaced headers, tab-only
rows) and a seed that loads only eligible rows and never overwrites.
**Verified** on the compose stack: the migrate job ran `seed-hcr` and loaded
`BFT` for `northwestern_med`, reporting `SAA`, `ANE` (NW Med) and `MAC`
(Anchovy Bay) as not HCR-eligible.

`apps/backend/…`:

- `src/surimi_backend/hcr/` (`models.py`, `schemas.py`, `service.py`,
  `router.py`, `seed.py`): new module.
- `src/surimi_backend/migrations/versions/20261106_0004_experiments.py`:
  table `harvest_control_rules` (unique per owner, scenario, species and
  `lower(life_stage)`, `NULLS NOT DISTINCT`; checks on the limits).
- `src/surimi_backend/catalog/data/northwestern_med_hcr_defaults.csv`,
  `anchovy_bay_hcr_defaults.csv`: the controller team's example (mail 2026-10-16) as sent.
- `src/surimi_backend/cli.py`: `seed-hcr`; it registers every model so the
  owner foreign key resolves (a fresh-process test guards this: the first
  compose run failed on it).

**Deploy:** migration `0004_experiments`; compose's migrate job now runs
`seed-hcr` too.
