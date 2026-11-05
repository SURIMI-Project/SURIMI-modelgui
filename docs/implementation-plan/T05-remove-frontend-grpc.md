# T05 — Remove frontend gRPC and restore dummy navigation

**Priority:** 1, confirmed by the user on 2026-11-05.  
**Status:** Implemented 2026-11-05; build and route-render checks passed. Browser click-through/visual review remains.  
**Goal:** The frontend stops contacting Rik’s controller and remains usable for design review with local demonstration data.

## Tasks

- [x] Replace scenario-availability and simulation-status controller calls with one coherent local demo data flow; enable all three case-study entries for review.
- [x] Make setup lead to one shared example simulation/report for every case-study flow, in the existing dashboard layout. Do not create runs or generate new results from user inputs.
- [x] Consolidate scattered mock datasets and hardcoded informational content into respective `.ts` files under `apps/frontend/mock-data/`; ordinary UI labels remain in components. Remove replaced source copies and obsolete mock creation/scaling code once callers no longer need them.
- [x] Remove frontend controller services/mock transport, generated Protobuf files, descriptor, generation configuration/scripts, and Protobuf date/duration imports.
- [x] Remove unused Connect/Protobuf dependencies and browser gRPC proxy configuration; preserve backend native gRPC and protocol generation.
- [x] Relocate the shared Buf CLI dependency before removing it from the frontend package, so backend stub-generation CI still works.
- [x] Label demo runs/results clearly and remove controller polling and hidden gRPC fallbacks.
- [x] Update affected documentation and validate frontend builds and navigation.

Use the [audit inventory](../plans/2026-11-04-frontend-rest-migration-audit.md#3-complete-removal-and-replacement-inventory) as the detailed file checklist. Keep the independent NetCDF lab and its reader dependency.

## Dependencies and boundaries

No experiment REST endpoint is needed for this temporary stage. Do not invent future backend payloads. TanStack Query and the shared REST foundation are established in T06 when connecting real server state; local fixtures do not need artificial fetching hooks.

**Confirmed product boundary:** No public SURIMI content pages. Dummy navigation is a temporary development state before authentication, not a public release.

## Confirmed route decision — 2026-11-05

The user confirmed `/test` stays public for now; `/netcdf-lab` must require login once T06 is implemented. This is an explicit exception to the general login-first content rule.

## Confirmed demo behaviour — 2026-11-05

**Latest user clarification supersedes the earlier in-memory-run plan:** simulate navigation through setup to fixed example simulation results. Do not create mock runs, including in memory. Do not use localStorage, IndexedDB, or other persistence. Inputs do not produce a new simulation or scientifically computed output in this stage.

Mock datasets and hardcoded informational content belong in respective `.ts` files under `apps/frontend/mock-data/`. Ordinary UI labels/headings stay in components. The user confirmed all three case studies show the same single example simulation/report.

**Read from source, 2026-11-05:** no i18n dependency/provider/language selector was found; the document language is English and copy is inline in components/configuration. No multilingual implementation has been requested as part of this cleanup.

Real experiment creation and persistence will be implemented through backend HTTP endpoints later. This cleanup connects no new backend endpoints.

## Done when

Case-study navigation and setup → fixed demo results can be reviewed without controller access or mock-run creation, using one shared example for all three case studies. The browser makes no gRPC requests; frontend protocol packages/imports are gone; backend protocol tooling still works. Fake execution/results remain identifiable.

## Verification — 2026-11-05

- **Verified:** frontend TypeScript/Vite production build; shared fixture has species/time grids; server-rendered home and 12 introduction/library/dashboard routes; all three libraries have one example and dashboard routes show the same report title.
- **Verified:** removed npm protocol packages absent; root Buf CLI answers version 1.73.0; Compose configuration parses.
- **Read from source:** setup navigates without creating/storing runs or running a timer; gRPC calls/polling/transport and proxy configuration removed; existing chart playback timer remains UI behaviour.
- **Not verified:** browser clicks, WebGL rendering, visual/responsive behaviour, Docker image rebuild or live backend integration. Existing build chunk-size warning remains.

See [removal audit](../plans/2026-11-04-frontend-rest-migration-audit.md) and [mock-data inventory](../../apps/frontend/mock-data/README.md).
