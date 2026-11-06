# Open issues

Known defects and open questions, most serious first in each section. Each item
says what is wrong, the evidence, who owns it and what fixing it takes. Nothing
here is fixed: a fixed item is deleted and the fix recorded in a
`CHANGELOG.md`. Maintained with `/issue`. Evidence labels:
[docs/README.md](README.md#evidence-labels).

---

## This repo

### Denied SSO callback displays JSON instead of a frontend error page

**Severity:** Low — access is denied correctly; recovery experience is incomplete.
**Evidence:** Verified 2026-11-05 against local Keycloak: Carol (no mapped role) receives HTTP 403 `no_access` at `/api/v1/auth/sso/keycloak/callback`, with no SURIMI access/refresh cookies.
**Owner:** backend/frontend callback contract; no backend changes authorized in this frontend task.

The backend redirects successful callbacks into the app but returns JSON for callback errors. A full-page browser navigation never mounts React on that JSON response, so the frontend cannot render a friendly failure screen there. Navigating back to `/login` remains possible.

**Next action:** agree a safe, non-sensitive failure redirect (or gateway error-page mechanism) with the backend owner. Do not add a dev-only Vite interception that would hide the production behaviour. This issue does not grant access to a rejected user.

### Existing frontend dependencies have npm audit findings

**Severity:** High — audit includes a critical MapLibre advisory
**Evidence:** Verified 2026-11-05, `npm audit --json`: 20 findings (2 low, 4 moderate, 13 high, 1 critical) after installing the REST foundation. Every reported package family was already present in the HEAD lockfile; Axios, Zod and TanStack Query are not listed in that report.
**Owner:** frontend dependency maintenance

The critical finding is MapLibre GL JS sanitizer bypass ([GHSA-jrc7-96c5-q579](https://github.com/advisories/GHSA-jrc7-96c5-q579)); the installed 5.x dependency falls in the reported range. Audit proposes a major MapLibre upgrade. This is a reported dependency finding, not a demonstrated exploit in this app.

**Next action:** review affected usage and plan dependency updates with map/chart/build regression checks. Do not run broad `npm audit fix --force` as part of request-layer work. No unrelated upgrades were attempted in this increment.

### Lint fails with 18 errors and 5 warnings

**Severity:** Low — CI runs lint in report-only mode until these are fixed
**Evidence:** Verified 2026-11-05 with the current frontend; changed case-map files pass targeted lint.
**Owner:** this repo
**Where:** 11 files in `apps/frontend/src/`

`npm run lint`: 14 × `@typescript-eslint/no-explicit-any`, 2 ×
`react-hooks/set-state-in-effect`, 1 × `@typescript-eslint/no-unused-vars`,
1 × `react-hooks/immutability` (errors); 5 × `react-hooks/exhaustive-deps`
(warnings).

**Fix:** fix them in their own change, then remove `continue-on-error` from
the lint step in `.github/workflows/ci.yml`.

### Bruno `SubmitExperiment` example requests a species the scenario cannot run

**Severity:** Low — the example fails at `CreateRegulations` after minutes of initialisation
**Evidence:** Verified 2026-10-30
**Owner:** this repo
**Where:** `resources/bruno/surimi-modelgui/grpc-proxy/SubmitExperiment.yml`

The example includes `ANE` adult. The `northwestern_med` recruitment, quota
and quota-share files cover only BOG, HKE (adult, juvenile), PIL (adult), MUT
(adult) and BFT, so the run fails with `No recruitment configuration found for
species (ANE, adult)`.

**Fix:** use HKE and PIL adult in the example; validate species in the backend
before submitting ([features/experiments](features/experiments/README.md)).

---

## Controller and model services

Controller facts below are **Read from source** in `SURIMI-controller` commit
`a8a7f3a` (2026-10-22) unless marked otherwise; the full picture is in
[ARCHITECTURE.md § Controller behaviour](ARCHITECTURE.md#controller-behaviour).

### "No available pods" is not reported to the caller; the run hangs in `Initialising`

**Severity:** High — over capacity, a run never starts and nobody is told
**Evidence:** Read from source; Rik (2026-11-03) confirms there is no queue and "you get an exception"
**Owner:** Rik (controller)
**Where:** `SimulationDispatcher.cs` (`throw new Exception("No available pods")`), `ExperimentManager.SubmitExperiment`

`SubmitExperiment` returns OK at once and initialises in a background task.
When no pod is free, the dispatcher throws inside that task; the exception is
logged, the simulation stays `Initialising`, and `GetSimulationStatuses` never
shows an error.

**Fix:** upstream, set `Error` (or a new `Rejected`) with the message, or
reject in `SubmitExperiment`. Meanwhile our queue counts pods so we do not
over-submit, and flags runs `Initialising` longer than 10 min
([ADR 0015](decisions/0015-experiment-admission-queue.md)).

### A failed initialisation never reaches `Error`

**Severity:** High — runs look stuck for ever
**Evidence:** Read from source; seen in runs 2026-10-30
**Owner:** Rik (controller)
**Where:** `SimulationManager.InitSimulationAsync` (no error handling)

Any failure during initialisation (missing S3 input, a service down, no pod)
leaves the status at `Initialising`. The experiment-level init in
`RunExperimentAsync` logs and rethrows into a task nobody awaits.

**Fix:** upstream. Meanwhile the backend flags these runs `stalled`.

### `Error` simulations keep their Ecopath pod

**Severity:** High — each error permanently removes one of the 10 pods until the controller restarts
**Evidence:** Read from source
**Owner:** Rik (controller)
**Where:** `EcopathServiceClient.cs`: `ReleasePodFromSimulation` is called only from `FinaliseSimulationAsync` and `CancelSimulationAsync`; the `Error` paths of `RunSimulationAsync` call neither

**Fix:** upstream, release the pod (and cancel the downstream services) on
`Error`. Meanwhile our queue counts `Error` simulations as using a pod, so it
does not over-submit, and the admin queue view shows them.

### `RemoveExperiment` only cancels `Running` simulations and reports success anyway

**Severity:** High — cancelling a run that is still initialising does nothing, silently
**Evidence:** Read from source; Rik (2026-11-03): "You can cancel a running experiment. Then it has the status Cancelled"
**Owner:** Rik (controller)
**Where:** `ExperimentManager.CancelExperimentAsync`, `SimulationManager.CancelSimulationAsync`

`CancelSimulationAsync` throws for any status other than `Running`;
`CancelExperimentAsync` logs and swallows that, and the RPC returns success.
The status set is `Canceled` (American spelling), not `Cancelled`.

**Fix:** upstream, allow cancelling in every state and return an error when
nothing was cancelled. Meanwhile our `cancelling` state retries until the
simulations are `Running`.

### The controller forgets every experiment when it restarts

**Severity:** Medium — runs in progress disappear from `GetSimulationStatuses`
**Evidence:** Read from source (`ExperimentManager._experiments`, `SimulationManager._simulations` are in-memory dictionaries)
**Owner:** Rik (controller)

**Fix:** upstream, persist state. Meanwhile the backend marks an experiment
`failed` (lost) after 3 polls without it.

### The `rikkert` and `project-surimi` controllers answer 404 to every gRPC call

**Severity:** Medium — those two namespaces cannot be used; the controller in `user-alexiosgkikas` works
**Evidence:** Verified 2026-11-03: `grpcurl` with the descriptor, Envoy, and the backend's client all get HTTP 404 (`UNIMPLEMENTED`) from `user-rikkert-surimi-controller.lab.dive.edito.eu` and `project-surimi-surimi-controller.lab.dive.edito.eu`. The controller at `user-alexiosgkikas-surimi-controller.lab.dive.edito.eu` answers, with reflection on, protocol `b10b05a0ca7f`
**Owner:** whoever runs those namespaces

The working `user-alexiosgkikas` controller also answered one call with 404
and the next with a 10 s timeout on 2026-11-03 (backend log, `/api/v1/scenarios`
502 then 504); a few minutes later it answered normally. **Verified**; cause
unknown, probably a restart on EDITO.

Looks like the controller services are not running behind those ingresses.
The backend reports it as `controller_unavailable` ("does not serve …, wrong
host, or not running").

**Fix:** start them if they are still needed; until then use
`user-alexiosgkikas`.

### `SimulationStatus.status` is a free string

**Severity:** Low — known values must be copied by hand
**Evidence:** Read from source
**Owner:** Rik (controller)
**Where:** `surimi/v1/simulation_status.proto`, field 6

The controller sets exactly `Initialising`, `Initialised`, `Running`,
`Finished`, `Error`, `Canceled`.

**Fix:** upstream, an enum. Meanwhile the backend maps these six and keeps
the raw value.

### Market service hides S3 errors behind an attribute error

**Severity:** Medium — the real cause of a market init failure is not logged
**Evidence:** Read from source, 2026-10-30
**Owner:** SURIMI-market team
**Where:** `SURIMI-market` `src/server/s3_storage.py:119,124`

`MarketError.MarketError(` should be `MarketError(`. Present in both the
`Official-EwE` and `SURIMI-Project` copies of the repo.

**Fix:** upstream, one-line change in each copy.

---

### FastAPI's TestClient warns that `httpx` is deprecated for Starlette

**Severity:** Low — tests pass; the warning will become an error in a later Starlette
**Evidence:** Verified 2026-11-03, `StarletteDeprecationWarning` in the backend test run
**Owner:** this repo
**Where:** `apps/backend/tests/`

**Fix:** follow Starlette's migration note when upgrading; the tests use only
`TestClient`, so the change is in `pyproject.toml` dev dependencies.

---

## Simulation output data

All seen in runs `89c1e2a4…` (to 2014) and `99c1e2a4…` (to 2030, 205 months) on
`project-surimi`, copies in `output_folder/experiments/`. **Verified**
2026-10-30. Causes not established. The backend will clean and count
these ([features/experiment-outputs](features/experiment-outputs/README.md)).
Owner: output creator and model teams.

### Prices and sales values contain infinities and extreme outliers

**Severity:** High — charts would show nonsense
`price` has infinities and huge finite values: MTS at ESQAJ is broken in 151 of
200 priced months (around 52,800 EUR/kg in 2013-06); ALB at ESLLC reaches about
1.3e15 EUR in 2013-11; SBA at ESSPP spikes. `sales_value` is infinite in 79 of
205 months.

### Species in one functional group share one biomass series

**Severity:** High — summing species overstates total biomass 1.53×
86 species rows with biomass hold only 38 distinct series.

### No adult biomass for ANE, HKE, MUT and PIL

**Severity:** Medium — biomass appears only under the juvenile life stage

### Stock assessment stops at 2013

**Severity:** Medium — the `.bin` has a stock assessment frame, the `.nc` has
no `stock_status` or `exploitation`, and the assessment ends in 2013 although
the run goes to 2030.

### `fishing_activity` empty for 5 of 9 fleets

**Severity:** Medium

### Two runs with the same inputs differ in their first 13 months

**Severity:** Medium — catch differs by up to 57%; cause unknown

---

## Open questions

| Question | Who |
| --- | --- |
| Partial results: can outputs be read per simulation, or per scenario, as each finishes? Asked 2026-11-03, not answered | Rik (controller) |
| Will the controller release pods of `Error` simulations, report pod errors, or add a queue? | Rik (controller) |
| Exact bucket path of outputs and read credentials for `project-surimi` | Controller team |
| Message type in the `.bin`; is it needed if the `.nc` has everything? | Controller team |
| How the outputs of the 5 simulations of an MSE experiment are written and should be combined | Controller team |
| Climate scenario codes: Bruno sends `RCP_4.5`, the bucket has `ssp126/ssp245/ssp585` | Controller team |
| Are the EDITO experiments S3 credentials static keys or temporary (session token)? Download links signed with temporary ones die with the token | EDITO, controller team |
| Public S3 endpoint for browsers: `https://minio.dive.edito.eu`? | EDITO |
| Self-registration for local accounts | User |
| Password reset by e-mail: is there an SMTP server to send from? | User |
| How should the admin list show an SSO user whose access was removed at the provider (today: last role kept, cannot sign in)? | User, phase 10 |
| Should admins' experiments jump the queue by default | User |
| Confirmation of the retention periods in ADR 0013 by the project's data protection contact | User |
| Retention of raw outputs in the bucket | Controller team |
