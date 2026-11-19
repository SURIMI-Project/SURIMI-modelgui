# Frontend REST migration — audit and discussion

**Date:** 2026-11-04  
**Scope:** Audit and proposed migration sequence only. No frontend, backend, dependency, or deployment-code changes are made by this document.  
**Evidence:** Read from the current branch's source unless explicitly labelled otherwise. Endpoint implementation below is not a claim of a successful live API test.

**Follow-up, 2026-11-05:** T05 cleanup is now implemented; see [the current ticket](../implementation-plan/T05-remove-frontend-grpc.md). The user superseded the in-memory-run proposal with a single shared fixed report for all cases and no mock-run creation. Fixtures/content live under `apps/frontend/mock-data/`. The inventory and local startup evidence below are the original 2026-11-04 audit snapshot.

## 1. Agreed direction

The user confirmed this sequence:

1. Identify and remove the frontend's direct controller/gRPC integration.
2. Keep the frontend navigable using plain local demonstration data first.
3. Understand and design password authentication and SSO.
4. Define the generic REST request function, services, and TanStack Query hooks.
5. Connect the endpoints that exist, then migrate further features as the backend delivers them.

The target production flow is:

```text
React page
  → TanStack Query hook
  → REST service function
  → shared request function
  → our backend /api/v1
  → Rik's controller through server-side gRPC
```

For example: sign in → session cookies → `GET /api/v1/scenarios` → backend calls the controller → JSON → available case studies.

**Important:** We can remove the old frontend gRPC path during the dummy-data stage even though some REST replacements are not built. Plain fixtures replace those missing UI data sources temporarily. There must be no fallback to browser-to-controller calls.

## 2. What exists now

### Frontend

| Area | Current behaviour |
| --- | --- |
| Home `/` | `useAvailableScenarios` calls gRPC `GetScenarioNames`; a failed request becomes an empty set, disabling all case studies |
| Introduction `/scenario/:caseId` | Case-study copy, graphics, and configuration UI are mostly local |
| Runs `/scenario-runs/:caseId` and `/:runId` | `useSimulationStatuses` polls gRPC `GetAllSimulationStatuses`; rows use generated Protobuf types |
| Setup completion | Creates an in-memory mock run and navigates after a 4.8-second timer; no real experiment submission |
| Outputs `/scenario-outputs/:scenario` and `/outputs/:caseId` | Local mock datasets; comparison can synthesize a dataset for an unknown run ID |
| CMSY++ `/test` | Existing demonstration charts and local data |
| NetCDF `/netcdf-lab` | Isolated EarthyScience experiment, outside the controller integration |
| Authentication | No frontend login page, session restoration, route guard, refresh handling, or SSO UI |
| Server-state management | Custom `useEffect`/`useState` hooks and a polling timer; no TanStack Query dependency installed |

Only **two distinct controller operations are used by UI hooks**: scenario names and all simulation statuses. `getSimulationContract` has a service wrapper but no UI caller. Generated methods and mock handlers do not establish actual UI integration.

### Backend

The application registers health, authentication, admin-user, and scenario routers in `apps/backend/src/surimi_backend/main.py`.

| Endpoint | Implemented here | Intended frontend use |
| --- | --- | --- |
| `GET /api/v1/auth/providers` | Yes; public | Discover configured SSO buttons |
| `POST /api/v1/auth/login` | Yes; public | Password login; body `{login, password}`, response is the user and session cookies |
| `GET /api/v1/auth/me` | Yes; authenticated | Restore/read the current user |
| `POST /api/v1/auth/refresh` | Yes; refresh cookie + CSRF | Renew session cookies; response `204` |
| `POST /api/v1/auth/logout` | Yes; authenticated + CSRF for cookie auth | End the session; response `204` |
| `POST /api/v1/auth/password` | Yes; authenticated + CSRF | Change password, including mandatory first-login changes |
| `GET /api/v1/auth/sso/{provider}/login` | Yes | Browser redirect to Keycloak/provider |
| `GET /api/v1/auth/sso/{provider}/callback` | Yes | Backend handles provider callback, sets cookies, redirects into the app |
| `POST /api/v1/auth/token` | Yes | Scripts/Bruno only: bearer token, no browser session cookies or refresh |
| `GET /api/v1/scenarios` | Yes; authenticated | Scenario availability |
| `GET /api/v1/scenarios/{scenario_name}/contract` | Yes; authenticated | Scenario configuration metadata |
| `/api/v1/admin/users` and user-management subroutes | Yes; admin | Later admin screens; not required for the first scenario integration |
| Experiment list/submit/cancel and simulation status REST routes | **Not registered** | Planned; not available as replacements yet |
| Output/chart/map/download REST routes | **Not registered** | Planned; current dashboard data stays demonstrative |

Source: `auth/router.py`, `auth/schemas.py`, `users/router.py`, `catalog/router.py`, relative to `apps/backend/src/surimi_backend/`. The feature index and experiment/output READMEs also mark the missing features as planned.

Do not treat paths appearing in planned feature documents as already callable APIs.

## 3. Complete removal and replacement inventory

Paths below are relative to the repository root. These are **future actions**, not changes performed in this audit.

### Delete the frontend-only controller implementation

| Path | Action and prerequisite |
| --- | --- |
| `apps/frontend/src/lib/services/controller.ts` | Delete; move its consumers to plain fixtures first, then REST services |
| `apps/frontend/src/lib/services/controllerMock.ts` | Delete; this is a mock gRPC transport, not a protocol-independent fixture |
| `apps/frontend/src/gen/` | Delete all existing generated Protobuf JS/declarations (56 files, including Google/validation dependencies), after replacing consumer imports |
| `apps/frontend/proto/` | Delete the descriptor `surimi.binpb` and the frontend protocol folder |
| `apps/frontend/buf.gen.yaml` | Delete the frontend Protobuf generator configuration |

Future generated **OpenAPI** TypeScript types are different from these Protobuf files. Removing the latter does not mean abandoning API types.

### Rewrite consumers; keep the UI

| Path | What must change |
| --- | --- |
| `apps/frontend/src/hooks/useAvailableScenarios.ts` | Replace custom fetching with local fixture availability in the dummy stage; later use a TanStack scenario query |
| `apps/frontend/src/hooks/useSimulationStatuses.ts` | Remove gRPC polling and Protobuf types; use a demo run provider until a real experiment/status API exists |
| `apps/frontend/src/pages/SimulationCaseSelectionPage/SimulationCaseSelectionPage.tsx` | Decouple entry/navigation from controller availability in the dummy stage; later distinguish loading, signed-out, API error, and genuine scenario unavailability |
| `apps/frontend/src/pages/ScenarioRunsPage/ScenarioRunsPage.tsx` | Replace `SimulationStatus`, `Timestamp`, `Duration`, `timestampDate`, controller copy, and direct-controller assumptions with a plain presentation model |
| `apps/frontend/src/lib/config.ts` | Replace the gRPC endpoint default `/api/controller` and old mock flag with REST/demo configuration as needed |
| `apps/frontend/src/data/simulationCases.ts` | Keep case IDs and backend scenario names; rename `controllerScenarioName` to an API-facing name such as `scenarioName`, updating its consumers |
| `apps/frontend/src/features/ScenarioRuns/useScenarioSetupCompletion.ts` | Keep only explicitly demonstrative local behaviour at first; do not describe the timer as backend progress or a real successful submission |

The current `mockScenarioRuns.ts` and `features/ScenarioRuns/types.ts` contain plain TypeScript objects, ISO date strings, and local helpers. They are possible reuse points, but do not directly match the current runs page's Protobuf-shaped rows. Define an explicit adapter/presentation type rather than keeping the protocol dependency.

**Keep the service-layer concept.** `lib/services/` itself is not obsolete; its replacement functions will call our REST API rather than Rik's controller.

### Remove frontend packages and generation scripts

| Item | Action |
| --- | --- |
| `@connectrpc/connect` | Remove from `apps/frontend/package.json` |
| `@connectrpc/connect-web` | Remove from `apps/frontend/package.json` |
| `@bufbuild/protobuf` | Remove after replacing generated messages and date/duration helpers |
| `@bufbuild/protoc-gen-es` | Remove; only the deleted frontend generator uses it |
| `@bufbuild/buf` | Remove from the **frontend package**, but preserve the shared CLI through the relocation below |
| `proto:pull`, `proto:gen` | Remove from frontend scripts and root forwarding scripts |
| Root `package-lock.json` | Regenerate consistently with workspace dependency changes; do not manually delete arbitrary lock entries |

**Shared-tool dependency discovered:** `.github/workflows/ci.yml` installs npm dependencies to provide Buf for `packages/proto/generate.py`. That script searches PATH and root `node_modules/@bufbuild/buf-*/bin/buf*`.

Proposed solution: move `@bufbuild/buf` to a root development dependency, or provide an explicit pinned CLI installation in backend CI. Do not delete it from the frontend and accidentally break Python-stub generation. Coordinate this tooling move with the backend developer; it does not put gRPC back into the browser.

### Remove browser gRPC infrastructure and stale settings

| Path | Future cleanup |
| --- | --- |
| `apps/frontend/vite.config.ts` | Remove `MOCK` parsing and `__MOCK__` definition; retain the NetCDF plugin; later add a same-origin REST development proxy |
| `apps/frontend/src/vite-env.d.ts` | Remove `__MOCK__`; document any replacement REST setting accurately |
| `apps/frontend/.env.example` | Remove the Envoy URL and frontend `MOCK` instructions; document REST proxy/base settings |
| `apps/frontend/eslint.config.js` | Remove the obsolete Protobuf `src/gen` exclusion; decide separately where OpenAPI types will live |
| `apps/frontend/Dockerfile` | Remove `ARG MOCK`, its build-command assignment, and `CONTROLLER_BASE_URL`; retain `API_BASE_URL` and NetCDF source copying |
| `deployments/nginx/default.conf.template` | Remove `/api/controller/`; retain SPA fallback, `/api/v1/`, and request-ID forwarding |
| `deployments/compose.yml` | Remove frontend mock build args, `web.CONTROLLER_BASE_URL`, and the `grpc-proxy` service/profile; preserve backend gRPC settings, PostgreSQL, API, migrations, web, and Keycloak |
| `deployments/envoy/` | Remove once the frontend uses fixtures/REST only; the backend's native gRPC client does not need Envoy |
| `deployments/.env.example` | Remove frontend mock/proxy-only settings (`MOCK`, `CONTROLLER_BASE_URL`, `GRPC_PROXY_PORT`, `CORS_ALLOWED_ORIGINS`); retain backend `CONTROLLER_MODE` and `CONTROLLER_GRPC_URL` |
| Local ignored `.env` files | Retire stale root frontend settings without copying secrets to tracked files; ensure actual settings are read from the intended folder |
| Documentation | Update runtime instructions, architecture's current-state section, phase statuses, affected issues, and feature changelogs during implementation |

`resources/bruno/.../grpc-proxy/` is developer tooling, not browser runtime code. Review it with its owner: retain controller-debug examples if useful or retire them separately. It does not justify keeping the frontend proxy. The REST `api/` collection remains useful.

### Explicitly retain

- `apps/backend/`, including its native gRPC integration and fake controller.
- `packages/proto/` and Python protocol generation/drift checks.
- Backend `CONTROLLER_MODE=grpc` / `CONTROLLER_GRPC_URL` settings.
- The React pages, styling, input flows, navigation, and plain demonstration datasets needed for the initial dummy frontend.
- `experiments/netcdf-lab/` and `@earthyscience/netcdf4-wasm`: independent file-reading work, not controller gRPC. Reassess production inclusion separately from this cleanup.
- UI case IDs and their mapping to API scenario names, e.g. `northwestern-mediterranean` → `northwestern_med`.

## 4. Stage one: a navigable dummy frontend

**User-confirmed direction; implementation not started.**

- Use the three local `simulationCaseStudies` entries to enable all case-study navigation. Aegean Sea must not remain disabled because the old mock deliberately omitted it.
- Supply clearly labelled plain fixture rows to the runs page, including stable IDs for View/Compare navigation.
- Use one coherent local run source so a run created by the demo setup flow appears in the demo list. Today those two paths use different sources.
- Preserve output routes and local output datasets. Make synthetic/fallback output data explicit; it is not the result of a real submitted run.
- Replace Protobuf dates/durations with plain UI values and formatters. The eventual REST status shape is not yet defined; a demo view model is not a promised backend DTO.
- Remove both old controller hooks/transport and their packages as part of this stage. Do not keep a hidden gRPC fallback.
- Do not fetch auth, scenarios, or experiments while this stage is intentionally local-only. Ordinary assets and the explicitly opened NetCDF lab are separate from backend/controller traffic.

**Completion check:** home → each introduction → setup → demo runs → View/Compare works without API availability; direct-route refresh works; no gRPC packages/imports, controller requests, or 15-second controller polling remain in the frontend.

## 5. Authentication to understand before implementing

Read from `auth/router.py`, `auth/cookies.py`, `auth/dependencies.py`, and [auth documentation](../features/auth-and-users/README.md).

### Local password login

1. Send `{login, password}` to `POST /api/v1/auth/login`.
2. Backend returns the user and sets `surimi_access`, `surimi_refresh`, and `surimi_csrf` cookies.
3. Access and refresh are **HttpOnly**: frontend JavaScript does not read or store them.
4. The readable `surimi_csrf` cookie supplies `X-CSRF-Token` for cookie-authenticated requests that change data, including refresh/logout/password changes.
5. Restore the user with `GET /api/v1/auth/me`. Roles are `admin` and `member` in this implementation.
6. If `must_change_password` is true, show password change before protected catalogue/features; `/me`, logout, and password change support that state.

The browser should use `/login`, not `/token`. The latter is a separate bearer-token flow for scripts, not the session mechanism the UI should implement. The example CSRF value supplied in a message is not a constant to copy into code; it changes when session cookies are renewed.

### SSO / Keycloak

1. Read `/auth/providers` to discover available providers and their `login_url`.
2. Navigate the browser to the selected login URL. This is a redirect flow, not a JSON fetch of a login page.
3. Backend and Keycloak handle the authentication exchange and callback.
4. Backend sets the same session cookies and redirects into the frontend.
5. Frontend reads `/auth/me` and uses the same session/role handling as local login.

No Keycloak client secret, provider refresh token, or gRPC credential belongs in the frontend. The backend enforces access; hiding an admin button is only presentation. Handle explicit failures such as `no_access`, inactive accounts, and password-change requirements.

### Origin and local setup

- Prefer one browser origin for the frontend and `/api/v1`. Docker nginx already provides this at `http://localhost:18080`.
- For Vite development, propose proxying `/api/v1` to the backend at port 18082. FastAPI currently has no browser cross-origin middleware configured; simply pointing fetch at another origin is not equivalent.
- Use `localhost` consistently; do not mix it with `127.0.0.1` across a cookie flow.
- SSO callbacks use `PUBLIC_BASE_URL`. The local Keycloak realm currently permits localhost ports 18080, 18082, and 8000, **not 5173**. A Vite-based SSO flow needs coordinated callback registration/configuration; otherwise it will return to the Docker frontend or fail.

## 6. Generic request function → services → TanStack hooks

**TanStack Query is user-confirmed direction.** File names and API-type tooling below are proposed, not installed or implemented.

| Layer | Responsibility | Example |
| --- | --- | --- |
| Generic REST request function | Base URL, cookies, JSON body/response, `204`, error normalization, cancellation, CSRF, bounded auth refresh | `request<T>(path, options)` |
| Services | Plain async functions describing backend endpoints; no React hooks or component state | `authService.me()`, `scenarioService.list()`, `scenarioService.getContract(name)` |
| TanStack hooks | Query keys, caching, loading/error state, enabled conditions, invalidation; mutations for writes | `useCurrentUser()`, `useAuthProviders()`, `useScenarios()`, `useScenarioContract(name)`, `useLogin()`, `useLogout()` |
| Pages/components | Render state, collect inputs, navigate | Case cards receive scenario availability from `useScenarios()` |

Proposed feature boundaries: `src/lib/api/` for the request/error/type infrastructure; `src/features/auth/` and `src/features/scenarios/` for their services, query keys, and hooks. Avoid replacing one giant controller client with another giant file mixing all responsibilities.

Request rules to agree and implement:

- Include cookies, never copy tokens into localStorage or construct browser bearer tokens.
- Read the **current** CSRF cookie for every relevant request and retry: refresh rotates it.
- For an expired protected session, allow one shared in-flight refresh and one retry. Do not recursively refresh the refresh/login requests, refresh wrong credentials, or retry indefinitely.
- Preserve `AbortSignal` from TanStack. Cancelling one consumer must not cancel another consumer's shared session refresh.
- Normalize backend `{error: {code, message, details, request_id}}` and validation/network errors. Distinguish `401`, permission `403`, `429`, and controller `502/504`.
- Do not automatically retry experiment-creation mutations after an ambiguous failure without an agreed idempotency contract.
- Clear user-scoped query data on logout or account switch. Keep one source of truth for the current user rather than duplicating it in unrelated context state.

The repo's proposed [ADR 0006](../decisions/0006-protocols-rest-sse-grpc.md) suggests `openapi-typescript` / `openapi-fetch` plus TanStack Query. Confirm whether to adopt that tooling or a typed fetch wrapper; this audit installs neither. Generated types would come from `/api/v1/openapi.json`, not controller reflection. `ContractOut.simulation` is currently a dictionary, so OpenAPI generation alone will not make all nested simulation fields strongly typed.

Session/auth queries and actions can be built first on the shared request infrastructure. Business queries are enabled only after session restoration and any required password change finish. During the transition, demo runs/outputs must remain explicitly separate from authenticated server data; an API failure must not silently substitute a successful fake result.

## 7. First business endpoints and remaining gaps

After authentication, connect:

1. `GET /api/v1/scenarios` → `{ "scenarios": [{ "name": "northwestern_med" }] }` → case availability.
2. `GET /api/v1/scenarios/northwestern_med/contract` → `{ "scenario_name": "northwestern_med", "simulation": { ... } }` → inspect supported configuration metadata before wiring it into forms.

A **simulation contract still exists as business data** returned by REST. We remove browser Protobuf descriptors and RPC communication, not the need to understand species, units, dates, and allowed configuration.

For runs/submission/outputs, wait for actual implemented REST schemas and ownership rules. Do not guess endpoint payloads from the old `SimulationStatus` or equate one experiment with one simulation. Do not fetch all users' controller statuses and filter them in React as an access-control mechanism.

## 8. Local setup evidence and limitations

**Verified in the preceding setup pass:** the supplied local settings were written to git-ignored `deployments/.env`. This document contains no passwords or tokens. An old root `.env` still exists; explicit selection avoids its stale controller/mock settings overriding deployment settings:

```bash
docker compose --env-file deployments/.env -f deployments/compose.yml --profile keycloak up --build -d
```

**Verified limitation:** startup failed while fetching `ghcr.io/astral-sh/uv:0.10.4` for the backend image (`denied`). An isolated anonymous pull also failed. Saved Docker credentials and backend source were not changed. Therefore live Swagger/login/refresh/catalogue behaviour was not verified in this session; their contracts above are read from source.

Keycloak needs its profile enabled when `OIDC_PROVIDERS=keycloak` is used. Backend `CONTROLLER_MODE=fake` is a useful future REST integration test mode, but it is not the same as a network-free dummy frontend and does not bypass authentication.

## 9. Implementation checkpoints — all pending

- [ ] Agree this inventory and temporary dummy frontend behaviour.
- [ ] Replace the two controller-dependent UI flows with plain fixtures and remove the frontend protocol implementation/tooling, preserving backend Buf generation.
- [ ] Verify all existing routes and demo View/Compare/setup navigation without backend/controller traffic.
- [ ] Confirm cookie/SSO routes, browser origin, and refresh behaviour with the backend developer.
- [ ] Agree request/service/hook boundaries and API type-generation tooling; install TanStack when implementation starts.
- [ ] Build the shared request layer and auth hooks/UI; verify login, session restore, refresh, logout, password change, and SSO.
- [ ] Connect scenario list and contract queries; show genuine availability separately from errors/authentication states.
- [ ] Integrate experiments/statuses/outputs only when their REST contracts are implemented.
- [ ] Update affected architecture, feature docs/changelogs, deployment examples, and obsolete issue entries with each actual implementation step.

This audit authorizes no deletions or refactor by itself. The next code task should be the small, independently reviewable **dummy navigation + gRPC removal** checkpoint, following the user's chosen sequence.
