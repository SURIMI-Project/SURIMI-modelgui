# TODOs — 2026-11-18

## Planned for 2026-11-19: NetCDF output caching

- [ ] Keep file metadata and processed chart/map results in a bounded, shared in-memory cache outside the output modal.
- [ ] Key entries by file identity/version and selection: species, year, metric and comparison dates. Scope protected results to the user and clear them when the session changes.
- [ ] Evaluate retaining idle readers for five minutes after the last consumer closes; bound the number of retained readers and release workers on expiry or eviction.
- [ ] Reuse cached metadata and processed results when reopening; initialize a reader only when required data is missing. Deduplicate concurrent loads of the same file.
- [ ] Preserve range-based reads; do not introduce full-file downloads to populate the cache.
- [ ] Define invalidation for changed files and explicit retries. Treat signed download URLs as temporary access links rather than stable cache identities.
- [ ] Keep modal selections/drafts separate from cached file data. Browser refresh may clear the cache; persistent storage is outside this initial scope.
- [ ] Manually verify first open, close/reopen, uncached selections, comparison mode, expiry and session changes. Measure network, processing and rendering time before claiming performance gains.
- [ ] Run scoped TypeScript/lint checks; do not add tests or browser automation.

Current finding: closing the modal unmounts `useNetcdfReader`, closes its reader and terminates the workers. The worker-local series/grid caches and configured 32 MiB file-block cache do not survive. TanStack Query is currently used for session checks in this hook, not to cache NetCDF results. Caching was discussed only; implementation is pending.

## Polling lifecycle

- [ ] Stop frontend polling when no observed experiments remain active.
- [ ] Keep polling queued, running and `copying_results` experiments until a terminal state.
- [ ] Restart updates after creation or explicit refresh; preserve background-tab behaviour.
- [ ] Confirm progress changes appear without changing pagination.
- [ ] Keep simulation progress separate from output readiness: 100% can still mean results are pending.

## Scenario output modal

- [ ] Fetch output metadata with `useExperimentOutputs(experimentId)`.
- [ ] Display waiting, indexing, ready, missing and failed output states.
- [ ] Request `GET /experiments/{id}/outputs/download-url?file=nc` through the existing hook when a file is available.
- [ ] Handle S3 presigned URLs and local authenticated download paths separately.
- [ ] Reset download-link state on close and obtain a fresh link for a new download action.
- [ ] Never send API cookies or CSRF headers to an external presigned URL.

## Browser NetCDF flow

- [ ] Download and parse the NetCDF file in the browser, as requested.
- [ ] Map its actual variables into each case's independent output component.
- [ ] Reuse the retained dashboard components without synthetic data fallbacks.
- [ ] Confirm file size, browser memory requirements and storage CORS before integration.
- [ ] Keep CMSY pages independent and unchanged.

## Local output availability

- [ ] Resolve the missing output file: the local fake controller simulates progress but generates no NetCDF.
- [ ] Agree on real controller/storage access or a known matching NetCDF fixture.
- [ ] Obtain approval before changing backend, deployment or files outside `apps/frontend/`.

## Verification

- [ ] Manually verify creation, progress updates, terminal polling stop, details retrieval and file readiness.
- [ ] Run frontend TypeScript, lint and build checks after changes.
- [ ] Do not add tests or use browser automation.
