# Scenario output modal

- The runs list passes the experiment UUID and backend scenario name.
- `ScenarioOutputModal.tsx` uses the shared dark modal and `useExperiment`.
- Details come from `GET /api/v1/experiments/{id}`; query keys are user-scoped.
- Opening starts the enabled detail query; closing unmounts the modal observer.
- Loading, retry and response/case mismatch states stay in the shared shell.
- Each component under `cases/` receives the complete validated experiment detail.
- Case content is intentionally empty for this increment.
- The modal can open for pending, finished or failed runs to inspect their details request.
- No output metadata, download URL, NetCDF parsing or dashboard integration yet.
- Existing demonstration output routes remain separate.
