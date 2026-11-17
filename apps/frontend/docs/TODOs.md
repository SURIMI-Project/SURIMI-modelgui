# TODOs — 2026-11-18

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
