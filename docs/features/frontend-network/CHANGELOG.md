# Frontend REST foundation — changelog

## 2026-11-06 — Targeted catalogue read recovery

`serverState/scenarios/scenarioListOptions.ts` adds at most two retries with 1s/2s backoff for network/502/503/504 failures on the scenario catalogue GET. Global defaults, auth transport retry and writes are unchanged. Read options are shared by useScenarios and regression tests. Initial retries remain loading; terminal errors and failed background refreshes are presented explicitly by the case-selection page. All 26 network tests pass, with three new catalogue retry regressions. Local API logs exposed an upstream SSL error, recorded in ISSUES rather than claimed fixed in the backend.

## 2026-11-05 — Notify mounted session observers

Live local-login testing exposed a cache-replacement issue: removing the observed `auth/me` query detached route guards from updates. Session replacement now cancels requests, removes other queries, and updates the existing user query. Added a mounted QueryObserver regression test. See [local login changelog](../frontend-local-login/CHANGELOG.md) for live verification.

## 2026-11-05 — Request, contracts, services and TanStack foundation

**User-approved:** replace copied gateway/port/surge examples with SURIMI's Axios/Zod/services/query-hook structure. Original `apps/frontend/network/` and `serverState/` examples removed; supported files now live under `src/`.

**Implemented:** typed payload/service boundaries; runtime Zod payload/response validation; JSON/204 handling; API-relative path parameters; normalized application/FastAPI/network errors; CSRF cookies; one shared refresh with one retry and late-401 protection; cancellation without aborting shared refresh. Auth services/schemas match backend UserOut and routes; catalogue/contract services and user-scoped hooks are also available. One query provider is mounted; no existing page mounts a fetching hook. Auth mutations manage cache replacement/invalidation; terminal session failure clears protected queries and prevents a late `/me` response reviving cached identity.

**Dependencies:** Axios, Zod, TanStack Query; explicit dev esbuild dependency for bundling Node tests. OpenAPI-generated clients deferred by ADR 0017. No backend, Python protocol, nginx, Compose or deployment files changed; shared root npm lock changes only support frontend dependencies.

**Verification:** 18 transport/schema/cache tests passed, including compile-time payload checks. Targeted ESLint passed for new network/server-state/tests and main provider wiring. Final production TypeScript/Vite build passed. Tests use a controlled adapter, not a live server.

**Remaining:** login screen, route/session boundary, SSO browser redirects, Vite REST proxy, end-to-end cookie/CSRF/refresh verification and wiring the existing case-selection page. No experiment API is assumed. Existing bundle-size warning and dependency-audit findings are separate maintenance concerns.

**Scope check:** `git diff --name-only -- apps/backend packages/proto deployments .github` is empty. No commit created. Existing dependency audit reports 20 findings including one critical MapLibre advisory; recorded in `docs/ISSUES.md` rather than applying unrelated/major upgrades.
