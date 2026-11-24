# 0027 — HCR initial values and default rules come from the controller's `GetInitialHCRData`, read on every request and prefilled; the form never reads a stored copy

**Status:** Accepted 2026-11-23 (user)
**Date:** 2026-11-23
**Related:** [plan 2026-11-23-hcr-initial-data-from-controller](../plans/2026-11-23-hcr-initial-data-from-controller.md), [features/harvest-control-rules](../features/harvest-control-rules/README.md), [features/scenario-catalog](../features/scenario-catalog/README.md#initial-biomass-and-fishing-mortality); supersedes decision 3 of [0024](0024-harvest-control-rules-only-per-user-no-defaults.md) (empty fields, nothing prefilled)

## Context

- ADR 0024 (2026-11-16): no scenario defaults anywhere. A user with no saved
  configuration sees every HCR-eligible entry with **empty** fields and the
  controller's initial biomass and F beside them. At the time, no partner had
  given default values.
- The project changed course (mail thread "On creating Harvest Control Rules",
  2026-11-19 to 2026-11-23, forwarded to the user 2026-11-23): the controller
  team, the Ecopath team and the project agreed that **the controller provides
  default HCRs**. Users pick from them, change them, or start an experiment
  with none. **Confirmed by the controller team, 2026-11-20.**
- The protocol has one new RPC, `ControllerService.GetInitialHCRData(scenario_name)`.
  Per species (`species_code`, `length_class`, `age`, `life_stage`) it returns
  `initial_biomass`, `initial_fishing_mortality`, `default_biomass_limit`,
  `default_biomass_base` and `default_f_max`. The same commit **removed**
  `GetInitialBiomasses` and `GetInitialFishingMortalities`, which the backend
  calls today. **Read from source**, SURIMI-protocol `7d0953e` (2026-11-23).
- The unit of the biomass fields is kg. **Confirmed by the controller team,
  2026-11-23** ("Unit, as stated in the contract, is kg"). The values may still
  be wrong in size: see the plan's open questions.
- The controller forwards the call to Ecopath pod `surimi-ecopath-0` without
  reserving it (the scenario name is not a GUID). Ecopath reads one CSV per
  scenario from its blob store: `ecopath/<scenario>/<scenario>_initial_hrc_data.csv`.
  The file changes when Ecopath's spin-up export is regenerated. **Read from
  source**, SURIMI-controller `782b979` (`ControllerService.GetInitialHCRData`,
  `SimulationDispatcher.DispatchAsync`), SURIMI-Ecopath `3819d2c`
  (`InitialStateFileService`, `Program.cs`).
- **Verified** 2026-11-23 on `project-surimi`: `northwestern_med` returns 91
  entries; `anchovy_bay` and `aegean_sea` fail with `INTERNAL` (file missing).
- The RPC returns 91 entries for `northwestern_med`. The fisheries authority
  accepts rules for 6 of them, so eligibility is not the RPC's list
  (ADR 0017, 0023).

## Decision

The backend calls `GetInitialHCRData` on every request that needs reference
values or defaults; the form is never filled from a stored copy (no cache, no
copy in the catalog). Each distinct answer is kept as a record only
([ADR 0028](0028-initial-hcr-data-snapshots-per-experiment.md)). It exposes them in two places: `GET /api/v1/scenarios/{name}/experiment-options`,
per species entry, and a new `GET /api/v1/scenarios/{name}/initial-hcr-data`,
which replaces `/initial-biomasses` and `/initial-fishing-mortalities`. The
biomass fields are in kg and named with the `_kg` suffix (ADR 0022). Clients
**prefill** a new rule row with the entry's defaults; the user may change them.
A saved configuration and an experiment's request hold the user's numbers
only, never a reference to "the default". An entry with no default, or a
default of 0 (Ecopath writes 0 when EwE has none), starts empty. HCR
eligibility keeps coming from the scenario catalog; the RPC adds values, not
entries.

## Why

- The partners decided that the defaults are the controller's; a copy in our
  database would go stale without anyone noticing when Ecopath regenerates the
  file, which is what ADR 0024 already avoided for the initial values.
- One RPC replaces two, and the two old ones are gone from the protocol: the
  stubs cannot be updated without this change.
- Prefill-not-store keeps ADR 0018's rule: past experiments and saved
  configurations never change when a partner file does.
- Eligibility stays with the fisheries authority's files: a rule on any of the
  85 other entries fails at `CreateRegulations` minutes into the run
  (**Verified** 2026-10-30).

## Alternatives considered

| Option | Why not |
| --- | --- |
| Do nothing (keep ADR 0024: empty fields) | Goes against the project's agreement of 2026-11-20, and the two RPCs it uses no longer exist in the protocol |
| Import the defaults into our database (a table or the catalog workbook, ADR 0023) | A second copy of partner data that drifts from the controller; admins would have to re-import after every Ecopath export; ADR 0024 dropped exactly this |
| Cache the answer in the API process (for example 5 minutes) | Fewer calls to pod 0, but a regenerated file would show late, and a cache would need invalidation across API replicas. Only worth it if the calls turn out to disturb running simulations (plan, open question) |
| Treat the RPC's list as the eligible entries | 85 of 91 entries would fail at `CreateRegulations`; the proto comment says "species for which a HCR can be created", but the data does not match. Revisit when the controller team confirms the list is filtered |
| Store "use the default" as a marker in a configuration, resolved at submit | The rule an experiment ran with would depend on a partner file at submit time, and a saved configuration would change meaning on its own |

## Consequences

- The backend drops `get_initial_biomasses` and `get_initial_fishing_mortalities`
  from `ControllerClient` and adds `get_initial_hcr_data`. The fake controller
  serves a copy of the Ecopath CSV. The two old endpoints, their Bruno requests
  and the console's unit note are removed.
- Every controller this app talks to must run SURIMI-controller `782b979` or
  later and SURIMI-Ecopath `3819d2c` or later, with the CSV in its bucket.
  **Verified** 2026-11-23: `user-<developer>` answers `UNIMPLEMENTED`.
- The experiment options answer grows by three numbers per entry; field
  `initial_biomass` becomes `initial_biomass_kg`, a breaking change for the
  frontend's schema (`scenarioSchemas.ts`).
- If the defaults turn out to be wrong in size, users see wrong prefilled values
  until Ecopath fixes the file; nothing in our database needs repair.
