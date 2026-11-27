# 0030 — Scenario catalog tables, shipped CSVs and a per-scenario CSV import

**Status:** Accepted 2026-11-27 (user)
**Date:** 2026-11-27
**Related:** [plan 2026-11-27](../plans/2026-11-27-aegean-functional-groups.md),
[ADR 0023](0023-scenario-catalog-in-the-database-from-an-admin-workbook.md)
(its workbook, versions and restore are superseded; the database and
admin-only upkeep stand), [ADR 0029](0029-functional-groups-are-contract-entries-with-member-species.md)

## Context

- ADR 0023 put the catalog in the database, maintained through one Excel
  workbook with versions. Only its `species` table and a species CSV import
  were built (2026-11-16); groups are still JSON files written by a script.
- Groups now come from partner CSVs (the Aegean list, 2026-11-26) that will
  grow; the user wants them in the database (2026-11-27).
- Groups differ by scenario (Anchovy Bay, NW Med and Aegean group `ANE`
  three ways, **Read from source**); a species' name does not.

## Decision

1. Four tables, all keyed by `scenario_name` first; `species` stays global:
   - `catalog_scenarios`: `scenario_name`, `continent`, `region`,
     `subregion` (the partner list's, for CMSY), `notes` (`jsonb` list).
   - `catalog_groups`: `scenario_name`, `group_code`, `group_name`,
     `name_source` (`model_team` or `manual`).
   - `catalog_group_species`: `scenario_name`, `species_code` (foreign key to
     `species`), `group_code` (foreign key to `catalog_groups`),
     `name_in_source`, `cmsy_group`, `cmsy_stock_id`; a species is in one
     group per scenario.
   - `catalog_hcr_eligible`: `scenario_name`, `species_code`, `life_stage`
     (lower case, empty when none).
2. Shipped CSVs in `catalog/data/catalog/` are the first data:
   `surimi-backend seed-catalog` loads a scenario only when it has no
   `catalog_scenarios` row, and with `--update` replaces it. The migrate job
   runs it after `seed-species`.
3. Admins replace one scenario's groups from a CSV
   (`POST /api/v1/admin/scenarios/{name}/groups/import`): dry run by default,
   column mapping (so the partner file imports as sent), all or nothing,
   audited; the export is in the same format.
4. The scientific name of the file is not stored; it is compared with the
   `species` table and a mismatch is a warning.

## Why

- Per scenario where the models differ, global where the name belongs to
  the code; the foreign key to `species` keeps member codes real.
- The partners send CSV; the species import already does mapping, dry runs
  and all-or-nothing for CSV, and its code is reused.
- A scenario's list arrives whole, so the file replaces that scenario's
  groups; an upsert would leave a species moved out of a group ambiguous.
- Insert-only seeding means a deploy never undoes an admin's import, as for
  species.

## Alternatives considered

| Option | Why not |
| --- | --- |
| The ADR 0023 workbook with versions and restore | Larger to build; nothing needs several sheets at once; can still come later on top of these tables |
| Keep the JSON files | Every list update needs a developer and a release |
| Species per scenario | Repeats 13,567 names per scenario; a correction must be made three times |
| One table for species and groups | A species is in a different group per scenario; the two share no fields |
| Upsert mode for groups | A partial file cannot say a species left a group |

## Consequences

- No versions or restore: an admin's previous list is in the audit event's
  hash only; the export before an import is the backup.
- After an import the API replica that served it clears its catalog cache;
  other replicas follow within `CATALOG_CACHE_SECONDS`.
- The species import's `replace` mode refuses to delete codes these tables
  use.
