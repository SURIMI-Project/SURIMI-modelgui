# 0029 — Functional groups are contract entries with member species

**Status:** Accepted 2026-11-27 (user)
**Date:** 2026-11-27
**Related:** [plan 2026-11-27](../plans/2026-11-27-aegean-functional-groups.md),
[scenario-catalog](../features/scenario-catalog/README.md),
[ADR 0017](0017-scenario-catalog-from-partner-config.md) (its group model is
superseded), [ADR 0027](0027-hcr-initial-data-and-defaults-from-the-controller.md),
[ADR 0030](0030-scenario-catalog-tables-and-per-scenario-csv-import.md)

## Context

- The `aegean_sea` contract on `project-surimi` lists 7 entries, `CCR1` …
  `PF2`, and `GetInitialHCRData` answers the same 7 codes (**Verified**
  2026-11-27). They are MICE stocks: functional groups. A partner CSV names
  each and lists its species (50 FAO codes) (controller team, 2026-11-26).
- The controller is driven by these codes as `species_code`; the request does
  not change (user, 2026-11-27).
- ADR 0017 modelled a functional group as a set of contract entries (Ecopath
  groups above species). The user decided on 2026-11-27 that
  `northwestern_med` has no functional groups: groups exist only where the
  contract entries are groups.
- The frontend parses `experiment-options` and HCR configurations with
  schemas that require today's keys (**Read from source**).

## Decision

1. A functional group is a contract entry: its code is the `species_code`
   the controller receives. It has a name and member species (FAO codes),
   stored per scenario (ADR 0030).
2. Every response that lists entries (catalog `species`, initial HCR data
   `entries`, experiment options `species`, HCR configuration `rules`) keeps
   its shape and adds:
   - `kind`: `species` or `functional_group`;
   - `members`: the group's species (code, ASFIS name and scientific name,
     the partner's name, CMSY group and stock id); empty for a species.
   For a group, `species_name` is the group's name; `scientific_name` and
   `family` are null.
3. `functional_group`, `functional_group_name` and the catalog's
   `functional_groups` stay, deprecated, always null (empty list), until the
   phase 10 frontend stops reading them; then they are removed.
4. `hcr_eligible` stays, from the catalog.
5. `northwestern_med` and `anchovy_bay` have no groups: their contracts list
   species entries. Their earlier Ecopath group mappings are dropped.
6. With no groups of contract entries left, every output metric is served
   per entry (`levels` = `species`); the outputs' `functional_group`
   parameter finds no group.

## Why

- Rules, initial data, experiment requests and output queries all key on the
  contract entry; making the group that entry changes none of them.
- One schema for every scenario: clients render one list and read `kind`;
  no `oneOf`, no keys that come and go (user, 2026-11-27).
- Keeping the deprecated keys null keeps the current frontend parsing; their
  value is null in every scenario now anyway.
- Without `hcr_eligible` a user could build an NW Med experiment that fails
  at `CreateRegulations` (85 of its 91 entries cannot carry a rule,
  **Verified** 2026-10-30 and 2026-11-23).

## Alternatives considered

| Option | Why not |
| --- | --- |
| Groups above contract entries (`kind = group` vs `stock`, as first proposed) | Two group models for one idea; NW Med has no groups (user) |
| Make the 50 species the entries and translate to the stock code for the controller | Two rules on `HKE` and `WHB` would collide on `DF2`; a translation layer on every call |
| A different response shape per scenario (discriminated union) | Clients branch before reading anything; the schema is no longer one shape (user) |
| A new `hcr_targets` list | Renames what the frontend reads, for the same content |
| Remove the group keys now | Breaks the frontend's parsing before phase 10 |
| Stock codes as rows of the global `species` table | A stock code means something only inside its scenario; a stock is not a species |

## Consequences

- `aegean_sea` shows 7 named groups with their species; rules are set on them.
- NW Med output totals of biomass add up values Ecopath copied to every
  member of one of its groups (ISSUES.md).
- Clients label entries by `kind`; phase 10 removes the deprecated keys.
