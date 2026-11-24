# Scenario catalog — changelog

Newest first.

## 2026-11-23 — Initial values moved to harvest control rules; entries named for them

`GET /api/v1/scenarios/{name}/initial-biomasses` and `/initial-fishing-mortalities`
removed (the protocol dropped their RPCs); `GET …/initial-hcr-data` replaces them
([harvest control rules](../harvest-control-rules/CHANGELOG.md)). New
`scenario_catalog.name_entries` and `CatalogService.name_entries`: names from
the `species` table, group and eligibility from the catalog file, for any
`(species_code, life_stage)`, in the contract or not; a code without a row gets
null names and a `catalog.drift` warning. `CatalogService.initial_hcr_data` and
`require_scenario` (was `_require`). README § Initial biomass and fishing
mortality now points to the HCR feature. Ruff, format, mypy strict clean; 332
tests pass (integration included), 2026-11-23; `name_entries` unit-tested.

---

## 2026-11-16 — Steps 1 and 2 verified against PostgreSQL

**Status:** Ruff, format, mypy strict clean; **287 tests pass, all integration tests included** (PostgreSQL 17 in Docker), 2026-11-16. The entries below, written while Docker was down, said
the database tests had not run; they have now, and pass: migration
`0005_species`, `seed-species` (13,570 rows; insert-only and `--update`),
`/api/v1/species` (paging, search, filters, sorts), `EXPLAIN` showing each
index can serve its query, and the import and export (dry run, upsert,
replace and its protection, all or nothing, 413, 415, 403, CSRF).

Fixed on the way:

- Tests used `ZZA`–`ZZE` as made-up codes; with the whole ASFIS list loaded
  those are real species (`ZZC` Dark-mouth chimaera). Test codes now contain a
  digit (`T1A`…), which no ASFIS code has, and the cleanup only touches them.
- The search test expected `ake` to match nothing; `AKE` is an ASFIS code.
  It now uses `erluc` (only inside words).
- `replace` reported one error per code in use (capped at 100); it now
  reports one error with the count and the first 50 codes
  (`catalog/species_import.py`).
- `tests/test_database.py` lists the `species` table.

---

## 2026-11-16 — Step 2: admin species import and export; console species pages

**Status:** built (backend and console). Ruff, format, mypy strict clean; 185 tests pass. The 98 integration tests were **skipped** (Docker not running): seeding, the import apply, export, CSRF on the import and the index plans are **not verified against PostgreSQL**; the console pages were **not opened in a browser**.

Asked by the user, 2026-11-16: a console page that lists, filters and sorts
species, and admin import and export of species as CSV with a column mapping,
upsert or delete-and-insert.

`apps/backend/`:

- `src/surimi_backend/catalog/species_import.py` (new) — `parse_import`
  (UTF-8, delimiter, header mapping: explicit `map`, else same name, else ASFIS
  header; `target:` leaves a column unmapped), `_plan` (upsert: mapped columns
  only, so an unmapped `source` never flips ASFIS rows; replace: every column,
  deletions, codes in use protected), `_apply` (one transaction under
  `pg_advisory_xact_lock`, audit `species.imported`), `export_species`.
- `catalog/router.py` — `species_admin_router`: `GET /api/v1/admin/species/export.csv`,
  `POST /api/v1/admin/species/import` (raw `text/csv` body, read with the
  `CATALOG_IMPORT_MAX_MB` cap, 413 and 415). `catalog/schemas.py` —
  `SpeciesImportReport`, `ImportCount`, `ImportProblem`, `SpeciesImportMode`.
  `catalog/service.py` — `file_codes()`. `main.py` — routers in one loop.
- `catalog/species.py`, `cli.py` — `seed-species` inserts missing codes only;
  `--update` overwrites changed rows (admins own the rows now).
- `core/config.py` (`catalog_import_max_mb`), `core/errors.py`
  (`PayloadTooLargeError`, `UnsupportedMediaTypeError`), `startup.py`.
- `console/static/index.html`, `app.js`, `style.css` — Species card (search,
  filters, sort, pager) for everyone; Species import and export card for
  admins (export download; file header read in the browser; mapping
  pre-selected as the API does; Check, then Import only after a clean check
  of the same file and options; confirmation for replace).
- Tests: `tests/test_species_import.py` (new: ASFIS file maps itself,
  explicit mapping, `;`, every parse error, unmapped column; endpoints: dry run
  then apply, all or nothing, replace and its protection, export round trip,
  413, 415, 403, CSRF), `tests/test_species.py` (seed insert-only and
  `--update`). `node --check app.js` passes; every element id the script uses
  exists in the page.

`deployments/`: `nginx/default.conf.template` allows 10 MB for
`/api/v1/admin/species/import` only (nginx's 1 MB default stays elsewhere);
`compose.yml` and `.env.example` gain `CATALOG_IMPORT_MAX_MB`.
`resources/bruno/surimi-modelgui/api/admin/species/` (new).

**Deploy:** rebuild the backend and web images (the nginx template changed).
`seed-species` no longer overwrites rows: use an admin import, or
`surimi-backend seed-species --update`, to load a newer shipped list.

---

## 2026-11-16 — Sort species by code, name or scientific name

**Status:** built (backend). Gate in the entry below; the database tests are
**not run** (Docker not running).

- `GET /api/v1/species?sort=` `species_code` (default), `name`,
  `scientific_name`, `-` for descending, ties by code (`catalog/schemas.py`
  `SpeciesSort`, `catalog/repository.py` `_order`, `catalog/species.py`,
  `catalog/router.py`). Asked by the user, 2026-11-16.
- Indexes `species_name_idx (name, species_code)` and
  `species_scientific_name_idx (scientific_name, species_code)` in the model
  and migration `0005_species`; NULL names last ascending, first descending
  (PostgreSQL's default, so one index serves both directions).
- `tests/test_species.py`: order of each sort, unnamed rows' position, an
  unknown sort → 422, and `EXPLAIN` showing the sorts can use their indexes.
- Bruno `api/species/get species.yml`; docs `README.md`,
  `docs/database/` (README, `indexes.sql`, `schema.dbml`).

---

## 2026-11-16 — Whole ASFIS list, paged search, indexes

**Status:** built (backend). Ruff, format, mypy strict clean; 171 tests pass.
The 92 integration tests were **skipped** (Docker not running): the
migration, `seed-species` of 13,570 rows, `/api/v1/species` and the index test
are **not verified against PostgreSQL** yet.

The user changed the request the same day: keep **every** ASFIS species, load
the whole CSV, and give the table good indexes for search and lookups. ADR
0023 revised.

`apps/backend/`:

- `scripts/build_species_csv.py` — writes every ASFIS row (no filter), plus
  manual rows for codes in use ASFIS lacks. Run 2026-11-16 (**Verified**):
  13,567 ASFIS rows + `GRM`, `OTH`, `YRC` = 13,570 rows, 1,041,943 bytes.
- `src/surimi_backend/catalog/models.py` — `SEARCH_DOCUMENT`,
  `search_vector()`, indexes `species_search_idx` (GIN, full text),
  `species_isscaap_group_idx`, `species_family_idx`,
  `species_order_or_higher_taxa_idx`; the same in migration `0005_species`
  (not yet applied anywhere, so changed in place).
- `catalog/repository.py` — `SpeciesFilters`, `search_condition` (word
  prefixes through the GIN index, as the experiments name search),
  `search_species` paged with a total. `catalog/species.py`,
  `catalog/router.py`, `catalog/schemas.py` — `SpeciesPage` (`items`,
  `total`, `page`, `size`) replaces `SpeciesListOut`; filters
  `isscaap_group`, `family`, `order_or_higher_taxa`.
- `tests/test_species.py` — whole list, paging, word-prefix search (`ake`
  finds nothing), filters, and `EXPLAIN` with sequential scans off showing
  each index can serve its query.

`resources/bruno/surimi-modelgui/api/species/get species.yml` — paging and filters.

---

## 2026-11-16 — Step 1: species table loaded from a CSV

(Superseded the same day by the entry above: the list is no longer filtered to
the 315 codes in use.)

**Status:** built (backend). Ruff, format, mypy strict clean; 171 tests pass.
The 91 integration tests were **skipped**: Docker was not running, so the
migration, `seed-species`, `/api/v1/species` and the database name lookup are
**not verified against PostgreSQL** yet.

The user decided (2026-11-16): keep six ASFIS fields (code, English and
scientific name, family, order or higher taxa, ISSCAAP group), a Python script
that writes a CSV of only the codes in use, and a load into the database from
which the API serves names. ADR 0023 revised accordingly.

`apps/backend/`:

- `scripts/build_species_csv.py` (new) — writes
  `src/surimi_backend/catalog/data/species.csv` from the ASFIS CSV and the
  codes needed (contract copies, catalog files, HCR defaults); keeps manual
  rows. Run 2026-11-16 (**Verified**): 315 codes, 312 from ASFIS, 3 manual
  with empty fields (`GRM`, `OTH`, `YRC`).
- `src/surimi_backend/catalog/models.py` (new) — table `species`.
- `src/surimi_backend/migrations/versions/20261116_0005_species.py` (new) —
  revision `0005_species`.
- `src/surimi_backend/catalog/species.py` (new) — CSV format, `DbSpeciesLookup`
  and `CsvSpeciesLookup`, `seed_species` (insert or update, never delete),
  `list_species`, `get_species`; `catalog/repository.py` (new) — the SQL.
- `catalog/scenario_catalog.py` — names from the lookup, not the files;
  `species_codes`; drift "in the contract but with no species row" when a
  lookup was consulted. `catalog/service.py`, `main.py` — the lookup is passed
  to `create_app` (database by default).
- `catalog/schemas.py` — `family`, `order_or_higher_taxa` on catalog entries;
  `SpeciesOut`, `SpeciesListOut`. `catalog/router.py` — `GET /api/v1/species`,
  `GET /api/v1/species/{code}`.
- `catalog/data/*.json` — `species_names`, the ASFIS note and
  `built_from.asfis` removed; `scripts/build_scenario_catalog.py` no longer
  reads ASFIS.
- `cli.py` — `surimi-backend seed-species [--file]`.
- Tests: `tests/test_species.py` (new: format, shipped file covers every code
  in use, seed, API, sign-in), `tests/test_scenario_catalog.py`,
  `tests/conftest.py` (CSV lookup without a database; species loaded after
  migrating).

`deployments/compose.yml`: the migrate job runs `seed-species` before `seed-hcr`.
`resources/bruno/surimi-modelgui/api/species/` (new), `api/get scenario catalog.yml`.

**Deploy:** migration `0005_species`, then `surimi-backend seed-species` (the
compose migrate job does both).

---

## 2026-11-13 — Redesign: catalog in the database, maintained through one workbook (designed, not built)

**Status:** design only; no code changed.

- The user decided (2026-11-13) that admins alone maintain the catalog
  through one Excel workbook, and that a default workbook ships with the
  system. Recorded as
  [ADR 0023](../../decisions/0023-scenario-catalog-in-the-database-from-an-admin-workbook.md),
  which supersedes the storage and upkeep of ADR 0017.
- [README.md](README.md) rewritten: decisions, use cases, current state, the
  workbook's sheets and cell rules, import checks (errors and warnings),
  versions, install seeding, flows (import, request time, install), data
  model, admin API, configuration, where the changes go, tests, open
  questions. Everything beyond the user's decision is **Proposed**.
- Checked for the design (**Verified** 2026-11-13 on the catalog files): 49
  groups, 100 members, 6 HCR-eligible entries; the 49 codes `aegean_sea` and
  `northwestern_med` share have identical ASFIS names. **Read from source**:
  the partner inputs did not change since the files were built
  (SURIMI-Ecopath `156c130...735cc98`, SURIMI-data_preprocessing
  `92f4ad6...eb09c05`, SURIMI-fisheries-authority unchanged); `aegean_sea`
  species are every species with EU FDI landings in GSA 22 and 23
  (SURIMI-data_preprocessing `pipelines/aegean_sea/_targets.R`).
- Revised the same day (user): `species` holds only the codes in use, 315
  of ASFIS's 13,567 (union of the three contracts, group members,
  HCR-eligible entries and HCR defaults, **Verified** 2026-11-13), filtered by
  the generator; ADR 0023 updated before anything was built.

---

## 2026-11-12 — Initial biomass and fishing mortality from the controller

**Status:** built (backend). The user asked for them as their own calls to the
controller, not part of the catalog, because they can change.

- Protocol pin: `packages/proto/pyproject.toml` `ref =
  be08fd333a8649e586c9a4ebf546ad96` (SURIMI-protocol `250f617`, 2026-11-11),
  stubs regenerated: only `GetInitialBiomasses`, `GetInitialFishingMortalities`
  and their messages are new.
- Controller client: `SpeciesValue` and the two methods in `base.py`,
  `grpc_client.py` (read-only, retried on `UNAVAILABLE`), `fake.py` (reads
  `fake_initial_state/northwestern_med/initial_biomasses.csv` and
  `initial_catch.csv`, copied with LF endings from SURIMI-Ecopath `88e1121`;
  F = catch / biomass as in Ecopath; other scenarios fail like the real one).
- API: `GET /api/v1/scenarios/{name}/initial-biomasses` and
  `/initial-fishing-mortalities` (`catalog/router.py`, `catalog/schemas.py`,
  `catalog/service.py`); not cached; unknown scenario 404; controller failure
  502.
- Tests: `tests/test_catalog.py` (91 rows, ANE adult 123719.1598388878 and F
  4.2246 as `project-surimi` returned them, ALB = BON, BON F = 0, two calls
  reach the controller twice, `anchovy_bay` 502, unknown 404, sign-in needed),
  `tests/test_grpc_client.py` (wire mapping, absent F read as 0, error
  details).
- **Verified** 2026-11-12: Ruff, format, mypy strict clean; 235 tests pass.
  The two RPCs answered on `project-surimi` (the user, through Bruno), values
  identical to the repo file.
- **Verified** 2026-11-12 against real controllers, through the compose API
  (image built from this change):
  - `project-surimi`: both endpoints 200 for `northwestern_med`, 91 rows
    each, every value identical to the fake controller's (49 F of 0). The first
    call took 5.6 s, the next 0.1 s. `anchovy_bay` and `aegean_sea`: 502
    `controller_error`, "MinIO API responded with
    message=ecopath/<scenario>/initial_biomasses.csv" (the file is missing).
    `atlantis`: 404.
  - `user-<developer>`: 502 `controller_unavailable` (`UNIMPLEMENTED`), as
    that controller predates the two RPCs. See ISSUES.md.

## 2026-11-05 — Catalog files, endpoint and generator (step 4a)

- A first build earlier the same day named groups without a model name from
  their member species; the user rejected that and it was reverted. This
  build takes group names only from the EwE model files found in the
  SURIMI-Project org: `northwestern_med` from the private
  SURIMI-data_preprocessing (`data-raw/northwestern_med/northwestern_med.eiixml`,
  `92f4ad6`), `anchovy_bay` from SURIMI-Ecopath (`156c130`). Unknown names are
  null and the gaps are listed in `notes`.
- Added `apps/backend/scripts/build_scenario_catalog.py`;
  `src/surimi_backend/catalog/scenario_catalog.py`, `schemas.py`,
  `data/{aegean_sea,anchovy_bay,northwestern_med}.json`;
  `GET /api/v1/scenarios/{name}/catalog` in `router.py`; cached
  `CatalogService.scenario_catalog`; catalog files loaded in `create_app`.
- `FakeControllerClient` serves copies of the real contracts
  (`integrations/controller/fake_contracts/*.json`, from `user-<developer>`
  on 2026-11-05); `tests/test_catalog.py` updated for it.
- Tests: `tests/test_scenario_catalog.py` (merge rules, unnamed groups,
  levels, drift, notes, the shipped files, the endpoint for the three
  scenarios, 404, 401).
- Bruno: `api/get scenario catalog.yml`.
- Verified: Ruff, format, mypy strict clean (also on the script); 160 tests
  pass including the PostgreSQL integration tests; all 42 `northwestern_med`
  groups and 7 `anchovy_bay` groups named from the models, with the model's
  `GroupID` equal to the semantics `DBID` and the same members; regenerating
  gives identical files; the wheel contains the six JSON files; the merge
  against the live `user-<developer>` controller gives the same result as
  the fake (northwestern_med 42 groups, 6 HCR-eligible, drift SWO and VMA;
  anchovy_bay 1 reachable group, 6 drift lines; aegean_sea partial, 3 notes).
- Not verified: the endpoint through the compose stack and Bruno (only
  through TestClient); HCR eligibility against the fisheries authority files
  on S3 (only the GitHub repo).
