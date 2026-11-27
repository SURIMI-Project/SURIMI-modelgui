# Functional groups as contract entries (Aegean MICE stocks), catalog in the database

**Status:** Accepted 2026-11-27 (user); implementation started 2026-11-27
**Author:** written with Claude, 2026-11-27

Extends the [scenario catalog](../features/scenario-catalog/README.md) and the
HCR work of [plan 2026-11-23](2026-11-23-hcr-initial-data-from-controller.md).
Decisions: [ADR 0029](../decisions/0029-functional-groups-are-contract-entries-with-member-species.md)
(the model and the responses), [ADR 0030](../decisions/0030-scenario-catalog-tables-and-per-scenario-csv-import.md)
(tables, shipped CSVs, admin import; replaces the workbook of ADR 0023).

## Goal

- A user who opens `aegean_sea` sees its 7 functional groups by name
  ("Demersal fish 2") with the species each holds, and sets harvest control
  rules on them.
- The controller keeps receiving what it expects: the group code (`DF2`) is
  the `species_code` of the contract, `GetInitialHCRData`, saved rules and
  `SubmitExperiment`. Nothing is translated.
- Admins load and update a scenario's groups from a CSV like the one the
  partners send, without a release.
- Responses keep their shape; clients learn what an entry is from one new
  field, `kind`.

## Requirements

1. `aegean_sea`'s contract entries `CCR1`, `CCR2`, `DF1`, `DF2`, `DF3`, `PF1`,
   `PF2` are functional groups, each with a name and member species.
   *(user, 2026-11-27)*
2. The `GetInitialHCRData` request and the rules keep `species_code`; for a
   group it is the group code. *(user, 2026-11-27)*
3. `northwestern_med` has no functional groups; groups exist only where a
   scenario's contract entries are groups. *(user, 2026-11-27)*
4. Endpoints keep today's response shapes. Each entry gains `kind`
   (`species` or `functional_group`) and `members` (the group's species,
   empty for a species); a group's name is in `species_name`.
   *(user, 2026-11-27; `members` and `kind` on every endpoint proposed and
   agreed the same day)*
5. `functional_group` and `functional_group_name` stay in the responses,
   deprecated and always null, until the phase 10 frontend stops reading them.
   *(user, 2026-11-27)*
6. `hcr_eligible` stays: the controller lists more entries than can carry a
   rule (91 against 6 in `northwestern_med`). *(user, 2026-11-27)*
7. Species are global (one name per FAO code); groups and their members are
   per scenario. *(user, 2026-11-27)*
8. Everything the partner CSV says is kept, except what the `species` table
   already holds (the scientific name, checked instead). *(user, 2026-11-27)*
9. Groups are stored in the database and maintained by admins.
   *(user, 2026-11-27; ADR 0023)*

## Constraints and facts

- **`project-surimi` contract for `aegean_sea`**: 7 entries, the stock codes,
  no life stage; 4 fleet segments (`OTB`, `PS`, `BS`, `SSC`, `GRC`); market
  `EU`; no climate scenarios; `standards.species_code` "SURIMI aegean species
  code". **Verified** 2026-11-27. The repo's
  `SURIMI-controller/Includes/aegean_sea/aegean_sea_contract.yaml`
  (2026-08-11) still has 271 FAO codes (**Read from source**, `1b195c7`); the
  controller team is still working on the Aegean contract and experiments
  cannot run yet (**controller team, 2026-11-26**).
- **`GetInitialHCRData("aegean_sea")`**: 7 entries, one per stock code, each
  with initial biomass, F and non-zero defaults. **Verified** 2026-11-27.
- **Partner list** `Aegean_species_functional_groups.csv` (controller team,
  2026-11-26): 50 species, each in one of the 7 stocks; columns `Continent`,
  `Region`, `Subregion`, `Species`, `GroupCMSY`, `GroupMICE`, `Stock`, `Name`,
  `ScientificName`, `SpecCode`. All 50 codes are in the `species` table;
  15 English names differ from ASFIS; scientific names all match.
  `GroupCMSY`, `Name`, `ScientificName`, `SpecCode` are CMSY++ `id_file`
  columns. **Verified** 2026-11-27.
- **The frontend reads `experiment-options` and HCR configurations** through
  Zod schemas that require `species`, `functional_group` and
  `functional_group_name` (`apps/frontend/src/network/services/`). Removing a
  key breaks parsing; adding keys does not. **Read from source.**
- **Outputs** are read per entry code of the `.nc` species axis; group level
  needs the catalog's groups of contract entries (`outputs/queries.py`).
  **Read from source.**

## Decisions

| Decision | Choice | Why | ADR |
| --- | --- | --- | --- |
| What a functional group is | A contract entry (its code is the `species_code` the controller receives) with member species | The rule unit stays the contract entry: HCR, initial data, experiments and outputs keep working | [0029](../decisions/0029-functional-groups-are-contract-entries-with-member-species.md) |
| Response shape | Unchanged; add `kind` and `members`; group name in `species_name`; group fields deprecated and null | One schema for every scenario; the frontend keeps parsing | [0029](../decisions/0029-functional-groups-are-contract-entries-with-member-species.md) |
| `northwestern_med`, `anchovy_bay` | No groups (their contracts list species, not group codes) | Requirement 3; Anchovy Bay's Ecopath groups are not contract entries either | [0029](../decisions/0029-functional-groups-are-contract-entries-with-member-species.md) |
| Storage | `catalog_scenarios`, `catalog_groups`, `catalog_group_species`, `catalog_hcr_eligible`; `species` stays global | Per scenario where the models differ, global where the name is the code's | [0030](../decisions/0030-scenario-catalog-tables-and-per-scenario-csv-import.md) |
| Upkeep | Per-scenario CSV import and export (dry run, mapping, replace, audited); shipped CSVs loaded by `seed-catalog` | The partners send CSV; the species import already works this way; the workbook is not built | [0030](../decisions/0030-scenario-catalog-tables-and-per-scenario-csv-import.md) |

## Phases

### Phase 1: tables, shipped data, catalog from the database

- Migration `0009_scenario_catalog`: the four tables.
- Shipped CSVs in `catalog/data/catalog/`: `scenarios.csv`,
  `aegean_sea.groups.csv` (from the partner list), `hcr_eligible.csv`
  (`northwestern_med`'s 6 entries, `aegean_sea`'s 7 groups).
  `surimi-backend seed-catalog` loads a scenario only when it has no row
  (`--update` replaces it); the migrate job runs it after `seed-species`.
- The catalog service reads the tables (or the shipped files in tests); the
  JSON files and `load_catalog_files` go.

**Exit:** the catalog of each scenario is built from the tables; species
import's `replace` still refuses to delete codes in use.

### Phase 2: responses

- `kind` and `members` on the catalog's species entries, initial HCR data
  entries, experiment options' species and HCR configuration rules;
  `species_name` = group name for a group; `functional_group`,
  `functional_group_name` and the catalog's `functional_groups` deprecated
  and empty.
- `status` is `complete` when every contract entry has a name.

**Exit:** `aegean_sea` answers its 7 groups with their 50 species; NW Med
answers as before minus group fields.

### Phase 3: admin import and export

- `GET /api/v1/admin/scenarios/{name}/groups/export.csv`,
  `POST /api/v1/admin/scenarios/{name}/groups/import`.

**Exit:** the partner CSV imports as sent (with a mapping), dry run first.

### Phase 4: fake controller, console, Bruno, docs

- Fake controller: the Aegean 7-stock contract and initial data.
- Backend console: label groups by name, list their members.
- Bruno and OpenAPI examples; database docs; feature docs.

### Later (phase 10)

The frontend reads `kind` and `members`, shows the Aegean groups with their
species, and stops reading the deprecated fields; the backend removes them in
the same release.

## Risks

| Risk | Likelihood | Impact | Mitigation |
| --- | --- | --- | --- |
| The Aegean contract changes again (unfinished) | High | Groups not in the contract | Drift says so; admins re-import |
| NW Med biomass totals count a shared Ecopath value more than once once groups are gone | Certain | Wrong totals in output charts | Recorded in ISSUES.md; per-entry biomass is unaffected |
| Rules on the 7 stocks refused once Aegean experiments run (no fisheries authority inputs) | Medium | Experiments fail at `CreateRegulations` | Eligibility is one row per entry, editable; open question |
| After an import, other API replicas serve the old catalog until their cache expires | Low (one replica today) | Up to `CATALOG_CACHE_SECONDS` stale | Documented; the importing replica clears at once |

## Open questions

| Question | Who |
| --- | --- |
| Is the 7-stock contract on `project-surimi` final; will the repo's contract be updated? | Controller team |
| Can a rule be set on all 7 stocks; where do the Aegean fisheries authority inputs come from? | Controller team |
| Will `GetInitialHCRData` list only the entries that can carry a rule? Then `hcr_eligible` and `catalog_hcr_eligible` could go | Controller team |
| Do MICE outputs use the stock code as the `.nc` species axis? | Controller and MICE teams |
| Are the 50 species the whole composition of the 7 stocks? | MICE team |
