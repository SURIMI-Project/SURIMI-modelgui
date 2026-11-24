# Open issues

Known defects and open questions, most serious first in each section. Each item
says what is wrong, the evidence, who owns it and what fixing it takes. Nothing
here is fixed: a fixed item is deleted and the fix recorded in a
`CHANGELOG.md`. Maintained with `/issue`. Evidence labels:
[docs/README.md](README.md#evidence-labels).

---

## This repo

### Controller descriptor in the repo is out of date

**Severity:** Low — access is denied correctly; recovery experience is incomplete.
**Evidence:** Verified 2026-11-05 against local Keycloak: Carol (no mapped role) receives HTTP 403 `no_access` at `/api/v1/auth/sso/keycloak/callback`, with no SURIMI access/refresh cookies.
**Owner:** backend/frontend callback contract; no backend changes authorized in this frontend task.

The descriptor was pulled by reflection from `user-<controller-team>`. The registry module
`buf.build/surimi/surimi-protocol` has `GetSimulationStatuses(experiment_ids)`;
the local descriptor does not. Reflection is off on `project-surimi`, so
`npm run proto:pull` cannot refresh it from there.

**Next action:** agree a safe, non-sensitive failure redirect (or gateway error-page mechanism) with the backend owner. Do not add a dev-only Vite interception that would hide the production behaviour. This issue does not grant access to a rejected user.

### Existing frontend dependencies have npm audit findings

**Severity:** High — audit includes a critical MapLibre advisory
**Evidence:** Verified 2026-11-05, `npm audit --json`: 20 findings (2 low, 4 moderate, 13 high, 1 critical) after installing the REST foundation. Every reported package family was already present in the HEAD lockfile; Axios, Zod and TanStack Query are not listed in that report.
**Owner:** frontend dependency maintenance

The critical finding is MapLibre GL JS sanitizer bypass ([GHSA-jrc7-96c5-q579](https://github.com/advisories/GHSA-jrc7-96c5-q579)); the installed 5.x dependency falls in the reported range. Audit proposes a major MapLibre upgrade. This is a reported dependency finding, not a demonstrated exploit in this app.

**Next action:** review affected usage and plan dependency updates with map/chart/build regression checks. Do not run broad `npm audit fix --force` as part of request-layer work. No unrelated upgrades were attempted in this increment.

### Lint fails with 16 errors and 5 warnings

**Severity:** Low — CI runs lint in report-only mode until these are fixed
**Evidence:** Verified 2026-11-16 after the frontend redesign/cleanup: 16 errors and five warnings remain in preserved chart/output/video code. The redesign callback/ref findings were fixed.
**Owner:** this repo
**Where:** nine files in `apps/frontend/src/`

`npm run lint`: 14 × `@typescript-eslint/no-explicit-any`, 1 ×
`react-hooks/set-state-in-effect`, 1 × `react-hooks/immutability` (errors);
5 × `react-hooks/exhaustive-deps`
(warnings).

**Fix:** fix them in their own change, then remove `continue-on-error` from
the lint step in `.github/workflows/ci.yml`.

### Bruno `SubmitExperiment` example requests a species the scenario cannot run

**Severity:** Low — the example fails at `CreateRegulations` after minutes of initialisation
**Evidence:** Verified 2026-10-30
**Owner:** this repo
**Where:** `resources/bruno/surimi-modelgui/controller/SubmitExperiment.yml`

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

### The controller has no authentication and is reachable from the internet

**Severity:** High — anyone who knows the address can list every experiment and remove any of them
**Evidence:** Read from source, 2026-11-03 (the protocol has no credentials); the Bruno `controller/` requests call `RemoveExperiment` on EDITO without any
**Owner:** controller team
**Where:** `surimi.v1.ControllerService` on `project-surimi-surimi-controller.lab.dive.edito.eu` and the personal namespaces

Since 2026-11-17 this repo no longer exposes it: the gRPC-Web proxy (Envoy) and
nginx's `/api/controller/` route are gone, and only the backend calls the
controller. The controller's own public address remains.

**Fix:** restrict the controller at network level so only the backend reaches
it (an internal Service, or an ingress allowlist), or add authentication to the
protocol.

### "No available pods" is not reported to the caller; the experiment silently never starts

**Severity:** High — over capacity, a run never starts and nobody is told
**Evidence:** Read from source 2026-11-06 (SURIMI-controller `a8a7f3a`); **Verified** 2026-11-06 on `user-<developer>` (experiment `6e996aab…`); the controller team (2026-11-03) confirms there is no queue and "you get an exception"
**Owner:** controller team
**Where:** `SimulationDispatcher.DispatchAsync` (`throw new Exception("No available pods")`), `SimulationManager.InitSimulationAsync`, `ExperimentManager.SubmitExperiment`

`SubmitExperiment` returns OK at once and initialises in a background task.
When no pod is free, the dispatcher throws before the simulation is
registered: the exception is only logged ("Exception in Init simulation"),
and `GetSimulationStatuses` returns **nothing** for the experiment. Its id
stays known, so it cannot be submitted again under the same id. In an MSE
run, the simulations that did get a pod stay `Initialising` and keep their
pods. On 2026-11-06 all 5 pods of `user-<developer>` were held by the 5
`Error` simulations of `78c1e2a4…` (see the next item), so every submit failed
this way until the services were restarted.

**Mitigated here (2026-11-06):** the queue counts pods in use from the
controller's own list, `Error` included, and does not submit when they are
all held; the poller fails an experiment with no simulation after
`START_TIMEOUT_MINUTES` (5) with a message naming "No available pods", and
an MSE run with only some simulations started
([experiment-queue](features/experiment-queue/README.md)).
**Fix:** upstream, set `Error` (or a new `Rejected`) with the message, or
reject in `SubmitExperiment`.

### A failed initialisation never reaches `Error`

**Severity:** High — runs look stuck for ever
**Evidence:** Read from source; seen in runs 2026-10-30
**Owner:** controller team
**Where:** `SimulationManager.InitSimulationAsync` (no error handling)

Any failure during initialisation after the simulation is registered
(missing S3 input, a service down) leaves the status at `Initialising`. A
missing pod is different: the simulation is never registered (item above). The experiment-level init in
`RunExperimentAsync` logs and rethrows into a task nobody awaits.

**Fix:** upstream. Meanwhile the worker flags these runs `stalled` after
`INIT_TIMEOUT_MINUTES` (10).

### `Error` simulations keep their Ecopath pod

**Severity:** High — each error permanently removes one of the 10 pods until the controller restarts
**Evidence:** Read from source; **Verified** 2026-11-06 on `user-<developer>`: the 5 `Error` simulations of MSE run `78c1e2a4…` held all 5 pods until the services were restarted
**Owner:** controller team
**Where:** `EcopathServiceClient.cs`: `ReleasePodFromSimulation` is called only from `FinaliseSimulationAsync` and `CancelSimulationAsync`; the `Error` paths of `RunSimulationAsync` call neither

**Fix:** upstream, release the pod (and cancel the downstream services) on
`Error`. Meanwhile our queue counts `Error` simulations as using a pod, so it
does not over-submit, and the admin queue view shows them.

### `RemoveExperiment` only cancels `Running` simulations and reports success anyway

**Severity:** High — cancelling a run that is still initialising does nothing, silently
**Evidence:** Read from source; the controller team (2026-11-03): "You can cancel a running experiment. Then it has the status Cancelled"
**Owner:** controller team
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
**Owner:** controller team

**Fix:** upstream, persist state. Meanwhile the backend marks an experiment
`failed` (lost) after 3 polls without it.

### The `user-<controller-team>` controller answered 404 to every gRPC call

**Severity:** Medium — that namespace cannot be used; `user-<developer>` and `project-surimi` work
**Evidence:** Verified 2026-11-03: `grpcurl` with the descriptor, Envoy, and the backend's client all got HTTP 404 (`UNIMPLEMENTED`) from `user-<controller-team>-surimi-controller.lab.dive.edito.eu` and `project-surimi-surimi-controller.lab.dive.edito.eu`. The controller at `user-<developer>-surimi-controller.lab.dive.edito.eu` answers, with reflection on, protocol `b10b05a0ca7f`. **Verified** 2026-11-12: `project-surimi` answers again (the user, through Bruno, `GetInitialBiomasses`), so it runs SURIMI-controller `117e604` or later; `user-<controller-team>` not re-checked
**Owner:** whoever runs those namespaces

On 2026-11-13 the `user-<developer>` controller answered `UNIMPLEMENTED`
to every call, and its ingress HTTP 404, the day after it ran a full
experiment (**Verified**, backend and `curl`). The services in that namespace
had probably stopped.

The working `user-<developer>` controller also answered one call with 404
and the next with a 10 s timeout on 2026-11-03 (backend log, `/api/v1/scenarios`
502 then 504); a few minutes later it answered normally. **Verified**; cause
unknown, probably a restart on EDITO.

On 2026-11-03 the controller services looked not to be running behind those
ingresses. The backend reports it as `controller_unavailable` ("does not
serve …, wrong host, or not running").

**Fix:** re-check `user-<controller-team>`; if it still fails, start it if it is still needed.
Until then use `user-<developer>` or `project-surimi`.

### `SimulationStatus.status` is a free string

**Severity:** Low — known values must be copied by hand
**Evidence:** Read from source
**Owner:** controller team
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

### Scenario contracts and the models' config disagree

**Severity:** Medium — some species or whole scenarios cannot carry HCRs or functional groups, and the contract does not say so
**Evidence:** Verified 2026-11-05 (contracts on `user-<developer>`); Read from source, SURIMI-Ecopath `156c130`, SURIMI-fisheries-authority `a68715a`
**Owner:** controller, EwE and fisheries authority teams
**Where:** `SURIMI-controller/Includes/*/…_contract.yaml`, `SURIMI-Ecopath/Includes/*/…semantics`, `SURIMI-fisheries-authority/Includes/*/`

- `aegean_sea`: 271 species in the contract, but no group mapping and no
  fisheries authority inputs. It is to run a MICE model with 20 functional
  groups that reports by group (SURIMI-project issue #154), not published yet.
- `anchovy_bay`: the contract lists only `ANE` (juvenile, adult); the Ecopath
  semantics map 9 species onto 7 groups. No fisheries authority inputs.
- `northwestern_med`: `SWO` and `VMA` are in the contract but map to no
  Ecopath group. Only 6 entries can carry an HCR (BOG, HKE adult, HKE
  juvenile, PIL adult, MUT adult, BFT).
- The controller team's example HCRs (mail 2026-10-16) use `SAA` and `ANE` for
  `northwestern_med` and `MAC` for `anchovy_bay`, none of which the repo files
  accept. The S3 bucket may hold newer files.

**Fix:** the backend works around it with the
[scenario catalog](features/scenario-catalog/README.md)
([ADR 0017](decisions/0017-scenario-catalog-from-partner-config.md); from
[ADR 0023](decisions/0023-scenario-catalog-in-the-database-from-an-admin-workbook.md),
designed 2026-11-13, admins fill the gaps, such as the Aegean groups, through
the catalog workbook).
Upstream: put groups and HCR eligibility in the contract.

---

### `GetInitialHCRData`: values look wrong in size, two scenarios missing

**Severity:** Medium — these are the reference values and the defaults a user sets HCR rules from; if the sizes are wrong, every prefilled rule is about 54× too low
**Evidence:** **Verified** 2026-11-23 on `project-surimi` (backend Python client, scratch stubs from SURIMI-protocol `7d0953e`); Read from source, SURIMI-Ecopath `3819d2c`; computed from the repo file and the fake copy of the old RPCs' files
**Owner:** controller and Ecopath teams
**Where:** `SURIMI-Ecopath/Includes/<scenario>/<scenario>_initial_hrc_data.csv`, read from `ecopath/<scenario>/` in the namespace bucket; [plan 2026-11-23](plans/2026-11-23-hcr-initial-data-from-controller.md)

`GetInitialHCRData` replaced `GetInitialBiomasses` and
`GetInitialFishingMortalities` on 2026-11-23 and adds the default biomass
limit, biomass base and F max per species. The unit is kg (**Confirmed by the
controller team, 2026-11-23**).

- **Defaults.** Every default limit and base is the EwE density (t/km²) ×
  846 × 1000: BFT 0.008/0.032, ANE adult 0.17/0.68 and SAA 0.022/0.088 t/km²
  (the controller team's own example densities) all give exactly 846. The
  controller team's example of 2026-10-16 multiplied by the model area,
  45,547 km² (BFT limit 364,376 kg; the RPC gives 6,768 kg). If 846 is the
  number of water cells, the cell area (about 53.8 km²) is missing.
- **Initial biomass.** Each value is 12× (11.93 to 12.14) what
  `GetInitialBiomasses` returned for the same entry; F dropped by the same
  factor (HKE adult 1.08 → 0.091). A switch from tonnes to kg would be 1000×.
- **Entries.** 91 for `northwestern_med`, every one with non-zero defaults; 49
  with F = 0 (no catch). The fisheries authority accepts rules for 6 of them,
  though the proto says the list is the species "for which a HCR can be
  created". `HKE` with no life stage is a copy of `HKE juvenile` with F 0.
- **Other scenarios.** `anchovy_bay` and `aegean_sea` fail with `INTERNAL`,
  "MinIO API responded with message=ecopath/<scenario>/<scenario>_initial_hrc_data.csv"
  (**Verified** 2026-11-23): the Ecopath repo has no file for them.
- **`user-<developer>`** answers `UNIMPLEMENTED` (**Verified** 2026-11-23):
  see "The `user-<developer>` controller does not serve `GetInitialHCRData`".

**Fix:** upstream, in the Ecopath file (cell-area factor, the 12× change, the
two missing scenarios). Not raised with the partners: the user decided on
2026-11-23 that nothing waits on them. On our side (built 2026-11-23) the
values are shown as sent, and each distinct answer is kept as a snapshot
linked to the experiments that used it
([ADR 0028](decisions/0028-initial-hcr-data-snapshots-per-experiment.md)), so
the affected experiments can be found if the file is corrected.

---

### The controller does not enforce the protocol's validation rules

**Severity:** Low — today our backend checks the same rules, and the one gap (`climate_scenario`) does no harm; it would break `aegean_sea` runs if a service started validating
**Evidence:** Read from source 2026-11-13, SURIMI-controller `117e604` (`Program.cs`, `ControllerService.SubmitExperiment`, `PoseidonServiceClient.AddInitialise`), SURIMI-POSEIDON `ValidationInterceptor.java`, SURIMI-protocol `be08fd33`
**Owner:** controller team
**Where:** `SubmitExperimentRequest`, `TargetFishingMortality`, `InitialiseSimulationRequest`, `InitialiseExperimentRequest`

The protocol declares `buf.validate` rules: `scenario_name` and
`climate_scenario` not empty; HCR biomass in (0, 3.3e12] kg and `f_max` in
(0, 100]. The controller registers no validation interceptor and checks only
`scenario_name` on `SubmitExperiment`. A code search of the org finds
protovalidate only in POSEIDON, which validates every request it receives, and
the controller calls POSEIDON only for scenarios with `POSEIDON` fleet
segments (`northwestern_med` has 2; `aegean_sea` and `anchovy_bay` none).

- `aegean_sea` lists no climate scenarios, so the backend sends
  `climate_scenario = ""`, which the proto forbids. It works only because
  nothing checks it.
- Out-of-range HCRs would not be refused by the controller; the backend's
  checks (`hcr/schemas.py`, database checks) are the only ones.

**Fix:** ask the controller team whether `climate_scenario` may be empty for scenarios without
climate scenarios (then relax the rule) or which code to send, and whether the
controller should validate requests itself.

---

### The `user-<developer>` controller does not serve `GetInitialHCRData`

**Severity:** Medium — on that controller the experiment form opens without initial values and default rules, so a user there has nothing to start a rule from
**Evidence:** **Verified** 2026-11-23: `GetInitialHCRData` answers `UNIMPLEMENTED` for every scenario (the controller predates the RPC, protocol `7d0953e`). `project-surimi` serves it for `northwestern_med`
**Owner:** the user (that namespace)
**Where:** `GET /api/v1/scenarios/{name}/experiment-options` (a note instead of values), `/initial-hcr-data` (502); experiments submitted there get no snapshot (an `experiment.initial_hcr_unavailable` event)

Everything else works there: submit, statuses, and outputs, which our keys
read from `s3://oidc-<developer>/output_creator/experiments` (checked
2026-11-16; the local compose stack uses this controller since that day,
because our keys cannot read the `project-surimi` bucket: "Access Denied").

**Fix:** redeploy the controller (SURIMI-controller `782b979` or later) and
Ecopath (SURIMI-Ecopath `3819d2c` or later) there, and copy
`SURIMI-Ecopath/Includes/northwestern_med/northwestern_med_initial_hrc_data.csv`
to `ecopath/northwestern_med/` in that bucket. The old `initial_biomasses.csv`
and `initial_catch.csv` are no longer read.

---

### The output creator keeps every run's files on its own disk, and hides failed uploads

**Severity:** Medium — the output creator's disk fills up run by run; a failed upload looks like a finished run, so our experiment waits `OUTPUT_WAIT_MINUTES` and ends `outputs_missing`
**Evidence:** **Read from source**, SURIMI-output-creator `da3ec9d` (2026-09-29), 2026-11-16
**Owner:** controller team (SURIMI-output-creator)
**Where:** `server/netcdf_worker_main.py` (`main`), `server/s3_storage.py` (`UploadFilesToS3`), `server/experiment_recorder_manager.py`

- **Files kept.** Each run writes `/app/experiments/<id>/<id>.bin` (every
  message of the run) and `<id>.nc` in the output creator's container and
  uploads both to `output_creator/experiments/<id>/`, but nothing deletes the
  local copies afterwards (only a cancel deletes a partial `.bin`). On a
  container filesystem they go when the pod restarts; on a mounted volume they
  stay until someone deletes them.
- **Upload errors swallowed.** `UploadFilesToS3` catches every exception and
  only logs it ("Error uploading files to S3"); a missing `AWS_BUCKET_NAME` or
  `AWS_ACCESS_KEY_ID` returns early with a log line. The worker then logs
  "Finished experiment" and exits 0, so the controller sees no error.

Our side copes: the worker waits for the `.nc` to appear and stay the same
size, and gives up after `OUTPUT_WAIT_MINUTES` with `outputs_missing`
([experiment-outputs](features/experiment-outputs/README.md)).

**Fix (output creator):** delete `experiments/<id>/` after a successful
upload, and fail the worker (exit non-zero, logged as an error the controller
can report) when the upload fails.

---

### The OpenTelemetry SQLAlchemy instrumentation does not declare SQLAlchemy 2.1

**Severity:** Low — SQL spans work, but only because the version check is skipped
**Evidence:** Verified 2026-11-17: without the skip, the API logged "SQLAlchemyInstrumentor only instruments sqlalchemy >= 1.0.0, < 2.1.0" and Jaeger showed no SQL spans; with it, `tests/test_tracing.py::test_sql_statements_are_spans_under_the_caller` passes
**Owner:** this repo
**Where:** `apps/backend/src/surimi_backend/observability/tracing.py` (`skip_dep_check=True`)

`opentelemetry-instrumentation-sqlalchemy` 0.66b2, the newest, declares
`sqlalchemy < 2.1`; we run 2.1.6. It hooks only engine events, which 2.1 keeps.

**Fix:** when a release declares 2.1, upgrade it and remove `skip_dep_check`;
the SQL span test shows whether it still works.

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

Cause, 2026-11-05: Ecopath computes biomass per group and the series is
copied to each species mapped to the group in `northwestern_med.semantics`
(19 of 20 multi-species groups identical; **Verified** on `99c1e2a4…`). Catch
is per species (20 of 20 differ). This is model design, not a bug; the
backend handles it with per-metric levels
([ADR 0017](decisions/0017-scenario-catalog-from-partner-config.md)). Open:
confirm with the EwE team that this is intended.

The initial HCR data the controller serves (`GetInitialHCRData`) has the
same shape: each member of a group gets the group's initial biomass and
default limit and base (ALB = BON = 246,510.9 kg; GRQ = LQZ = OLV =
246,885.2 kg). So an HCR on one species of a multi-species group is triggered
by the whole group's biomass. **Verified** 2026-11-23 on `project-surimi`
(the same values as SURIMI-Ecopath `3819d2c`); first seen 2026-11-12 with
`GetInitialBiomasses`.

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
| Partial results: can outputs be read per simulation, or per scenario, as each finishes? Asked 2026-11-03, not answered | Controller team |
| Will the controller release pods of `Error` simulations, report pod errors, or add a queue? | Controller team |
| Exact bucket path of outputs and read credentials for `project-surimi` (our keys get "Access Denied" on the `project-surimi` bucket, **Verified** 2026-11-16; until then results of runs there cannot be read) | Controller team |
| Message type in the `.bin`; is it needed if the `.nc` has everything? | Controller team |
| How the outputs of the 5 simulations of an MSE experiment are written and should be combined | Controller team |
| Which species and life stages can carry an HCR per scenario; the controller team's examples `SAA`, `ANE`, `MAC` are not accepted by the repo files. Per life stage or per species for ANE, HKE, MUT, PIL? | Controller team |
| May `climate_scenario` be empty for a scenario that lists no climate scenarios (`aegean_sea`), though the proto says `min_len: 1`? See "The controller does not enforce the protocol's validation rules" | Controller team |
| Aegean Sea MICE model: its 20 functional groups and species vocabulary (issue #154) are not published; the contract still lists 271 species | Controller and MICE teams |
| Are the EDITO experiments S3 credentials static keys or temporary (session token)? Download links signed with temporary ones die with the token | EDITO, controller team |
| Public S3 endpoint for browsers: `https://minio.dive.edito.eu`? | EDITO |
| Self-registration for local accounts | User |
| Password reset by e-mail: is there an SMTP server to send from? | User |
| How should the admin list show an SSO user whose access was removed at the provider (today: last role kept, cannot sign in)? | User, phase 10 |
| Should the SSO callback redirect its errors (`no_access`, `email_taken`, `sso_failed`) to `next` with an error code instead of answering JSON, so the backend console and the phase 10 frontend can show a message? | User |
| Keep the backend console (`/api/v1/console/`) after phase 10 as an ops tool switched off in production, or remove it? | User, phase 10 |
| Should admins' experiments jump the queue by default | User |
| Confirmation of the retention periods in ADR 0013 by the project's data protection contact | User |
| Retention of raw outputs in the bucket | Controller team |
| Is there a Prometheus, Grafana, log store or OTLP collector on EDITO to send to? It decides what the phase 9 chart deploys ([observability-and-activity](features/observability-and-activity/README.md#open-questions)) | EDITO |
