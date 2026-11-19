# Scenario output modal

- The runs list opens the existing shared modal for experiment details or a NetCDF dashboard, using full viewport width/height and its compact header.
- `netcdf/NetcdfDashboard.tsx` adapts parsed data into `ScenarioOutputsView` models. It reuses the existing dashboard header, map panel, biomass chart, stacked landings/discards chart, market indicator cards, indicator panel and floating year wheel.
- Removed the duplicate `OutputTimeSeriesChart.tsx` and `OutputDashboard.module.css`; there is no separate NetCDF dashboard design.
- The results icon is disabled for API runs unless status is `completed`. Direct report links retain readiness checks, retry and error feedback.
- A labelled frontend-only sample row is pinned to the first Northwestern/all-cases page. It is excluded from backend totals and never creates or changes an experiment.
- The public sample URL lives in `mock-data/sampleOutput.ts` and matches the NetCDF lab example.
- Opening uses EarthyScience `NetCDF4.fromUrl` in a worker to read metadata, selected species series and selected-year spatial slices through HTTP byte ranges. There is no full-file download fallback (`maxFullDownload: 0`).
- Remote blocks use a 32 MiB per-reader cache with 256 KiB blocks; decoded species/grid selections also retain their bounded caches.
- The package remote worker assumes a Next.js asset path. A dedicated worker bootstrap supplies that path for the existing Vite-hosted assets without modifying the package. It buffers early init messages while importing the package, forwards startup/unhandled errors, and reports when the child handler is ready.
- Pending reader operations fail with a retryable message after 45 seconds without activity. Byte counters appear only after data starts arriving.
- Closing aborts remote operations, terminates child readers and clears caches. The loading message reports bytes read on demand rather than progress toward downloading the whole file.
- Ready real runs obtain their URL through the existing authenticated output service. External/signed downloads omit application credentials; local protected downloads use same-origin credentials.
- `components/GenericScenarionOutputSkeleton.tsx` uses the shared dashboard layout/cards for all cases during detail loading, remote reader startup and the first chart/map selections. It has an accessible status and respects reduced motion. Later selection changes keep the dashboard mounted.
- Retry and worker errors stay visible. Closing terminates workers, requests and playback; files are not persisted in query caches or local storage.
- The runtime reuses the unmodified JS/WASM assets already served by the NetCDF lab Vite plugin.

## Case readers

- Each case component selects its own reader under `cases/readers/NorthwesternMediterranean/`, `AegeanSea/` or `AnchovyBay/`.
- Each directory owns a worker entry, a reader profile and a configuration mapping canonical variable/dimension names to names in that case's file. All three initially retain the same species-based contract.
- `netcdf/reader.engine.ts` shares transport, decoding, validation, aggregation and bounded caches. Each worker has its own dataset and caches. `useNetcdfReader` rejects sources belonging to another case.
- Configurations can evolve independently. Functional-group semantics, new dimension orders or different scientific aggregation still require adapter/engine changes; name mappings alone do not establish support for those contracts.
- Label resolution and shared dashboard presentation are unchanged. Browser verification of all three case outputs remains manual.

## Data presentation

- Species and life stages are indexed from the file. Catalogue names and group filters enrich matching entries; unknown entries retain their file codes.
- Biomass totals and cell maps show mean recorded snapshots for the selected calendar year, in tonnes. No density conversion or area assumption is applied.
- Catch/discard/sales quantities sum recorded time steps and additive fleet/market axes. Landings are labelled as gross catch minus live and dead discards.
- Missing/fill/non-finite values remain missing; source scale/offset attributes are decoded. Unsupported units or dimensions produce an explicit error.
- Realised unit value is total sales value in EUR divided by sales quantity in tonnes. The sample's raw price variable only declares EUR, so it is not presented as EUR/tonne.
- Partial years include only their available records. The inspected sample has 205 monthly records from January 2013 through January 2030, 96 species/life stages and an 82 × 109 grid.
- Shared charts accept recorded data with gaps and loading/empty states. Recorded mode preserves source-derived annual points without smoothing, invented observations or confidence bands; demonstration defaults retain their existing presentation.
- The live dashboard omits the unsupported indicator panel entirely. Its header also omits the duplicate title/back action and selected-species summary; the modal title and selectors carry that information.
- Demonstration/design-system views retain their indicator panels and original controls.

## Comparison

- Select at most two ready outputs from one case. The sample can be one of them; the two failed local runs remain unavailable for comparison.
- Each source owns its reader. Compare only common time coordinates and unambiguous matching species code/life stage; normalize supported mass units to tonnes. Annual summaries and maps use only those shared records.
- Overlay annual charts with run names and use an explicit active-run switch for the map.
- Bounded per-species/per-grid caches and stale map queue coalescing avoid decoding whole spatial variables.

## Verification

- Inspected the sample metadata with the backend's installed HDF5 reader.
- Executed the frontend range reader and the actual EarthyScience remote worker/WASM outside a browser, with a Node worker/XHR compatibility bridge and real HTTP requests. Metadata, species series and a yearly biomass map decoded successfully.
- Measured response-body bytes for the public sample: metadata 5,242,881 bytes; first species chart series cumulative 7,254,689 bytes; its 2013 annual biomass map cumulative 12,759,713 bytes over 33 requests, versus the 311,079,584-byte file. Repeating the map added no bytes or requests. This is one workload, not a guarantee for every selection.
- Reproduced early init delivery during a delayed worker import using a Node worker/event bridge and the cached sample: one startup message was buffered and metadata, species series and the map then decoded. No browser automation was used.
- Browser rendering, external CORS behaviour and real experiment range delivery still need manual verification. No browser automation or tests were added.

## Per-case composition

- `ScenarioOutputContent.tsx` routes sample/ready sources and experiment details through the same case-specific components.
- `cases/NorthwesternMediterraneanScenarioOutput.tsx`, `cases/AegeanSeaScenarioOutput.tsx` and `cases/AnchovyBayScenarioOutput.tsx` each own their dashboard composition.
- Each currently chooses the shared `ScenarioOutputsView` through the adapter's render callback. A case can replace or rearrange its presentation without duplicating NetCDF parsing, transport, session handling or the modal shell.

## URL state and access

- Open output URLs use `/scenario-runs?case=<case>&run=<experiment-id>`; comparisons add `&compare=<second-id>`.
- The modal resolves each ID through the existing user-scoped detail hook, independently of list pagination or local row state. The known frontend sample ID resolves locally.
- Opening writes URL parameters; closing removes only `run` and `compare`. Refresh and browser Back/Forward derive modal visibility from the URL.
- IDs are validated; missing/inaccessible runs, unavailable outputs and incompatible comparisons show explicit states. Signed file URLs and credentials are never stored in the page URL.
- The existing login return path preserves query parameters. Sharing does not grant access: the current backend allows owners and admins to view experiments.

## Range integrity

- The package requests exact source bytes and decodes the same stored values as a whole-file read. Ranges do not approximate or downsample the file.
- Each ranged response must be HTTP 206 with matching Content-Range and body length. ETag and total-size changes are rejected when the server exposes those headers. Failed HEAD requests (for example on GET-only presigned URLs) do not establish a file snapshot.
- Reader errors remain visible rather than becoming zero values. Missing-value handling, unit conversion and scientific aggregation are separate from transport correctness.
- Inspected the actual cached sample through the remote reader bridge with range/size/ETag guards enabled; metadata, series and the annual map still decoded with the same values.
- TypeScript/production build, ESLint and whitespace checks passed. Browser rendering, refresh/history interactions and cross-account access still require manual verification; no tests or browser automation were added.

## Presigned output URLs

- Backend-issued presigned URLs are passed intact to the remote reader; external requests do not carry application session credentials.
- Storage must support ranged GETs and CORS, including access to Content-Range and preferably ETag. GET-only signatures may reject HEAD; the package then probes with a ranged GET.
- A URL must remain valid for subsequent reads. If it expires, reopening the output requests a fresh URL; automatic renewal during an open reader is not implemented.
- Compatibility is checked against the implementation; a real backend-issued presigned URL has not yet been exercised in this local fake-controller setup.
