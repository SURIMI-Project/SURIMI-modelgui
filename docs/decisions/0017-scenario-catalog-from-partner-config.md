# 0017 — Each scenario's functional groups, species and output levels come from a catalog file generated from the partners' sources and checked against the contract

**Status:** Accepted 2026-11-05 (the user asked to implement it from the findings of 2026-11-05); storage and upkeep (decisions 1, 3 and 5) superseded by [0023](0023-scenario-catalog-in-the-database-from-an-admin-workbook.md)
**Date:** 2026-11-05
**Related:** [plan 2026-11-05](../plans/2026-11-05-scenario-catalog-hcr-experiments.md), [features/scenario-catalog](../features/scenario-catalog/README.md), [features/experiment-outputs](../features/experiment-outputs/README.md), [features/experiments](../features/experiments/README.md)

## Context

- The user, 2026-11-05: each scenario has its own set of data; one may have
  only functional groups, another functional groups and species.
- The controller contract lists species as `species_code` + optional
  `life_stage` and nothing else: no functional groups, no names, no level.
  **Verified** 2026-11-05 on `user-<developer>`.
- Functional groups are Ecopath groups. The mapping species → group is in
  SURIMI-Ecopath `Includes/<scenario>/<scenario>.semantics` (group `DBID`).
  The group names are in the EwE model file (`.eiixml`, table
  `EcopathGroup`): for `anchovy_bay` in SURIMI-Ecopath, for
  `northwestern_med` in the private SURIMI-data_preprocessing
  (`data-raw/northwestern_med/northwestern_med.eiixml`, model
  "GSA0607EwENBS"). Its `GroupID` equals the semantics `DBID` for all 42
  mapped groups, with the same species. **Read from source**, SURIMI-Ecopath
  `156c130`, SURIMI-data_preprocessing `92f4ad6`. SURIMI-data_preprocessing is
  also where the contracts are produced.
- `aegean_sea` will run a MICE model, not Ecopath: 20 functional groups,
  4 fleets, reporting "by Functional Group, not species", with a
  scenario-specific species vocabulary still to be defined. **Confirmed by
  the controller team**, SURIMI-project issue #154 (2026-06-08). Nothing of it is published
  yet (SURIMI-mice-model has only a README); today's contract still lists 271
  ASFIS species codes.
- Species codes are FAO ASFIS `Alpha3_Code`s; English names come from the
  ASFIS list. **Confirmed by the controller team, 2026-10-15** (mail with `ASFIS_sp_2024.csv`).
- Species that can carry a harvest control rule are those with recruitment,
  initial quota and quota share rows in SURIMI-fisheries-authority
  `Includes/<scenario>/`; only `northwestern_med` has them (6 entries).
  **Read from source**, `a68715a`. Others fail at `CreateRegulations`
  (**Verified** 2026-10-30).
- In the output, group members have identical biomass but their own catch
  (**Verified** 2026-11-05, run `99c1e2a4…`). Summing members' biomass
  overstates it 1.53× ([ISSUES.md](../ISSUES.md)).
- The frontend hard-codes one 48-species CSV for all three scenarios.
- The user rejected group names derived from member species as placeholders
  (2026-11-05): names must come from the sources or stay empty.

## Decision

1. A **scenario catalog** per scenario,
   `apps/backend/src/surimi_backend/catalog/data/<scenario>.json`: functional
   groups (Ecopath group id as key, name, members as
   `(species_code, life_stage)`), English and scientific name and FAO ISSCAAP
   group of each code (from ASFIS), HCR-eligible entries, the sources and
   commits it was built from, and `notes` listing what the sources lack.
2. **Nothing is made up.** Group names come only from the EwE model file
   (`name_source: ewe_model`) or from a hand edit in the file (`manual`,
   kept on regeneration); otherwise the name is null. The same for species
   names missing from ASFIS.
3. The file is **generated** by `apps/backend/scripts/build_scenario_catalog.py`
   from shallow clones of SURIMI-data_preprocessing, SURIMI-Ecopath and
   SURIMI-fisheries-authority, the ASFIS list and the live contracts, then
   reviewed and committed. The same run refreshes the contracts the fake
   controller serves. JSON, not YAML: no new dependency, and YAML 1.1 reads
   bare words such as `OFF`, `ON`, `NO` as booleans.
4. **"Functional group" means the Ecopath group** (later: the MICE group for
   `aegean_sea`), the unit the model computes. No hand-made category layer;
   each species carries its ISSCAAP group, so a broad filter can be added
   from data we already have.
5. The backend loads the files at start-up and **merges them with the live
   contract** each time the contract is fetched (10 min cache): the contract
   decides what exists; mismatches are listed in `drift` and logged.
6. **Levels follow the data, by one rule**: `functional_group` when the
   scenario has groups; `species` when a group holds two or more species
   codes, or when there are no groups. `biomass` is at `functional_group`
   whenever groups exist; the other metrics at the finest level offered.
   Today: `northwestern_med` both, `anchovy_bay` functional groups only,
   `aegean_sea` species only and `partial` until its MICE groups are
   published. A group value is read from **one** member's series;
   species-level metrics are summed over members for a group total.
7. Served at `GET /api/v1/scenarios/{name}/catalog`.

## Why

- The controller does not know groups; the partner files are where the
  models and the contract pipeline get them, so copying from them keeps us in
  step with what the models really do.
- A file in git is reviewed, versioned with the code that reads it, and works
  offline in tests and with `CONTROLLER_MODE=fake`.
- Merging with the live contract catches drift without trusting the file
  blindly.
- Null instead of a placeholder keeps the API honest: a client can show the
  members, or "unnamed", and the gap stays visible in `notes`.
- Levels per metric follow the data: a species-level biomass chart would show
  the same line for 16 species of one group.

## Alternatives considered

| Option | Why not |
| --- | --- |
| Keep CSVs in the frontend (today) | One file for three scenarios, already wrong; outputs and validation in the backend could not use it |
| Database tables edited by admins | No admin UI until phase 10; the facts belong to partner repos, so hand copies drift; harder to review |
| Read `.semantics` and the EwE model from the S3 bucket at run time | Couples the API to Ecopath's internal formats and input paths; the bucket path and read rights for inputs are not settled |
| Names generated from member species when the model is missing | Rejected by the user, 2026-11-05: placeholders look like data |
| `ewe_functional_groups.csv` in SURIMI-data-mcp-history | Same NW Med groups, but its group numbers do not match the semantics `DBID`s (MTS is 10 there, 11 in the semantics); a derived copy, not the source |
| A fixed list of levels per scenario, set by hand | Goes stale when the partners change their config; the rule gives the right answer for today's three scenarios |
| Ship the whole ASFIS list (13,567 rows, 1.8 MB) in the backend | Only about 330 codes are used; the script copies those into the files |
| Ask the controller team to add groups to the contract | The right long-term answer (issue #126 goes that way), not available now |

## Consequences

- A developer reruns the script when a partner changes its config; the file
  records which commits it came from, and `drift` shows what changed in the
  contract since.
- The script needs read access to the private SURIMI-data_preprocessing repo.
- `aegean_sea` has no groups or HCRs until the MICE model's groups and the
  fisheries authority inputs are published.
- Phase 6 series and map endpoints take `level` and refuse a level a metric
  does not have; the rule "functional-group series counted once" in
  experiment-outputs is replaced by point 6.
- Phase 10 replaces the three frontend CSVs with this endpoint.
