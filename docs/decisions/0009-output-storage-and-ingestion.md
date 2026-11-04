# 0009 — Outputs stay in their files: read in place by chunk (S3 or local) through a chunk index; nothing copied into the database; presigned URLs only for raw downloads

**Status:** Proposed
**Date:** 2026-11-03
**Related:** [features/experiment-outputs](../features/experiment-outputs/README.md), [0007](0007-scheduler-worker-postgres-queue.md)

## Context

- The output creator writes `experiments/<id>/<id>.nc` and `<id>.bin` to the
  `project-surimi` bucket. Requirement: the backend reads either S3 or a local
  folder, set by configuration.
- User, 2026-11-03: reading must be as fast as possible (stream, read only
  what is needed, bounded memory). The user also asked why data from the file
  would be saved in the database, who would do it, and whether that duplicate
  is bad.
- Layout of the 205-month run `99c1e2a4…`, **Verified** 2026-11-03 with h5py:
  NetCDF4/HDF5, 309 MB stored, every variable chunked **one month per chunk**,
  gzip level 1. The four maps (`gross_catch`, `dead_discards`,
  `live_discards`, `biomass`) are 305 MB; `gross_catch` alone is 6.3 GB
  uncompressed. The chart variables (`*_total`, `price`, `sales_quantity`,
  `sales_value`, `fishing_activity`) are 1,640 chunks, 3.4 MB.
- Reads measured on that file, **Verified** 2026-11-03 (local disk; each read
  stands for a range request on S3):

  | Read | Requests | Bytes | Time |
  | --- | --- | --- | --- |
  | Map, 1 species, 1 month | 15 | 0.15 MB | 0.01 s |
  | Map, 1 species, 1 year | 50 | 1.67 MB | 0.06 s |
  | All chart variables, through h5py | 1,701 | 3.57 MB | 0.46 s |
  | All chart variables, through the chunk index with neighbouring ranges merged (gap ≤ 64 kB) | **2** | 3.57 MB | **0.08 s** including decompression |
  | All 205 months of `gross_catch`, one month at a time | 8,348 | 97 MB | 14 s, peak memory 141 MB |
  | Build the chunk index (kerchunk) | metadata only | — | 0.4 s; 27,523 chunks, 2.7 MB JSON |

- Known data problems in real outputs (infinities, outliers, shared series).
  **Verified** 2026-10-30, see [ISSUES.md](../ISSUES.md).

## Decision

### The file is the only copy of the data

No values from the `.nc` are stored in our database. PostgreSQL keeps only
metadata per run in `experiment_outputs`: state, the chunk index, the
data-quality report, `parser_version`, size. Charts and maps are both computed
on request from the file.

### Storage access

One setting, `OUTPUTS_URI` (`s3://project-surimi/experiments` or
`file:///data/experiments`), opened through `fsspec` (`s3fs` for S3). Files are
read in place by byte range; they are never copied whole to local disk.

### One job per finished run: index and report

The worker job `index_outputs`, started when the poller sees a run reach
`finished`:

1. waits until the `.nc` exists and its size has been stable for 60 s;
2. builds the chunk index with kerchunk (`SingleHdf5ToZarr`): for every chunk,
   its offset and length in the file. Only HDF5 metadata is read;
3. reads the chart variables once (2 merged range requests) to count
   non-finite and out-of-range values and find species that share a series,
   and stores those counts as the data-quality report;
4. stores index and report in `experiment_outputs`, sets `ready`, emits
   `experiment.outputs_ready`.

### Charts on request

`GET …/outputs/series` reads the chunks of the requested variable through the
index with merged ranges (at most the 2 requests above for everything; usually
less), decodes, cleans (non-finite → `null`), applies the functional-group rule
and the monthly or yearly aggregation, and returns the series.

### Maps on request

`GET …/outputs/maps` reads only the chunks that cover the requested metric,
species, life stage and months (0.15 MB for a month, 1.7 MB for a year),
decodes, cleans, sums over fleets if asked, and returns one 82 × 109 float32
grid (36 kB, ~10 kB compressed) plus the lat/lon axes.

### Caching and memory

- Outputs never change after a run finishes, so every chart and map response
  carries `Cache-Control: private, max-age=31536000, immutable` and an `ETag`;
  the browser asks once.
- Each API process keeps an LRU of compressed chunk bytes, bounded by
  `OUTPUT_CHUNK_CACHE_MB` (default 256). The chart variables of one run are
  3.6 MB compressed, so about 70 runs fit. Chunks are decompressed per request
  and dropped after it.
- Every reader works one month (one chunk) at a time; nothing holds a whole
  variable. Measured peak while streaming the largest variable: 141 MB.

### Downloads

Members download the `.nc` of their own experiments; admins download the `.nc`
and `.bin` of any experiment (**confirmed by the user, 2026-11-03**). The
`.bin` is for admins only until its format is known, and it is 1.3 GB.

The browser opens `GET /api/v1/experiments/{id}/outputs/download?file=nc` as a
normal link. The API checks the session and ownership, writes an
`outputs.downloaded` audit event, and then:

- **S3 mode:** answers `302 Found` with a presigned GET URL to the object,
  valid `PRESIGNED_URL_TTL` (15 min), signed for `S3_PUBLIC_ENDPOINT` (the
  address browsers can reach, not the in-cluster one) and carrying
  `response-content-disposition=attachment; filename="<name>_<id8>.nc"`. The
  browser downloads straight from S3; no file bytes pass through our backend.
- **Local mode:** answers with `X-Accel-Redirect: /protected-outputs/<id>/<id>.nc`
  and the same `Content-Disposition`; nginx, which mounts the outputs folder
  read-only, sends the file with `sendfile`. The `/protected-outputs/` location
  is `internal`, so it cannot be opened directly.

Both support `Range`, so a broken download of a large file resumes where it
stopped. **Verified** 2026-11-03: presigned URL against MinIO (file name,
`206` on resume, `403` after expiry and when the link is changed to another
file); nginx `X-Accel-Redirect` with the real 311 MB `.nc` (byte-identical
download, `206` on resume, `404` on the internal path).

Dashboards do **not** use presigned URLs: the browser would need the chunk
index, CORS on the bucket for `Range`, gzip decoding, and our cleaning rules
rewritten in TypeScript, and would download more (a map chunk holds 24 or 48
species: 150 kB from S3 against 10 kB from our API).

### `.bin`

Not read until its message type is confirmed by the controller team.

## Why

- **No duplicate data:** the file stays the single source of truth, so there
  is nothing to keep in step, re-ingest after a fix, or purge separately. The
  measurement shows the copy would not buy speed: all chart data of a run is 2
  requests and 0.08 s to decode, against a database query of about 0.05 ms but
  only after a whole ingestion pipeline.
- **Read in place by chunk:** the file is already chunked by month, so a map or
  a chart costs kilobytes to a few megabytes, not 309 MB.
- **Chunk index:** without it, every request walks HDF5 metadata with many
  small reads (1,701 for the charts); with it, a chart load is 2 requests.
- **One job that only indexes and counts:** the index and the quality report
  are the only things worth computing ahead of time; both are small metadata.
- **Immutable caching and a bounded chunk cache:** repeated views cost nothing,
  and memory use stays fixed whatever the number of runs.
- **Redirect to a presigned URL, or `X-Accel-Redirect`, for downloads:** the
  API only authorises; S3 or nginx move the hundreds of megabytes, with
  resume, and the API process never holds file bytes. A plain link works in
  every browser without JavaScript.
- **Short-lived links:** a leaked link stops working after 15 minutes and
  opens only that one file.
- **fsspec:** one code path for local and S3, as required.

## Alternatives considered

| Option | Why not |
| --- | --- |
| Copy the chart series into PostgreSQL once per run (the previous proposal) | Duplicate data to keep in step, re-ingest and purge; measured gain is small because the file read is already 2 requests |
| Download each `.nc` to a local cache, then parse | 309 MB of disk and transfer per run, when a view needs under 4 MB |
| Parse the `.nc` per request without an index | 1,701 small reads for the charts; slow over S3 |
| Store maps in PostgreSQL | Hundreds of MB per run duplicated; most maps are never viewed |
| Convert each run to Zarr in our own bucket | A second full copy; the chunk index gives the same access without copying |
| Stream downloads through the API (FastAPI `StreamingResponse`) | Every download holds an API worker and its bandwidth for minutes; resume needs our own `Range` handling |
| Return the presigned URL in JSON for the frontend to open | Works, but needs JavaScript; the redirect does the same with a plain link |
| Frontend reads chunks with presigned URLs | CORS and decoding in the browser, cleaning rules in two languages, larger downloads |
| Frontend downloads the whole `.nc` (h5wasm) | 309 MB in the browser |

## Consequences

- Download links are signed locally with the S3 credentials we get for the
  experiments on EDITO (read and write, user, 2026-11-03); signing needs no
  extra permission and no call to S3. A link allows only a `GET` of that one
  object: **Verified** 2026-11-03 against MinIO with read/write credentials,
  `PUT` and `DELETE` through the same link answer `403` and the object is
  unchanged; the secret key is not in the URL, only the access key ID. A link
  lives at most `PRESIGNED_URL_TTL` (and never more than 7 days, the SigV4
  limit). If the credentials are temporary (EDITO user credentials carry a
  session token, **Read from source** `SURIMI-controller` `SURIMI-gui/Models/EditoApp.cs`),
  a link also dies when the token expires, and the backend must reload
  refreshed credentials; static access keys have no such limit (open question
  which kind we get). The credentials stay in a Kubernetes Secret; the browser
  never sees them. nginx needs the outputs folder mounted read-only in local
  mode.
- Charts and maps need the bucket to be reachable; if S3 is down, dashboards
  are down (the run list and statuses still work). `/readyz` reports storage
  reachability.
- If the controller team deletes raw files, their dashboards go too; raw-file
  retention must be agreed with them, and we mark such runs `outputs_missing`.
- Cross-run analytics over many runs at once (for example an average over 100
  runs) would read 100 files; not a requirement today. If it becomes one, a
  derived store can be added then, by a new ADR.
- The reading code depends on the variable names and dimensions; a
  `parser_version` per output and a contract test against
  `output_folder/experiments/99c1e2a4…`.
- To measure in phase 6 on EDITO: range-request latency of the
  `project-surimi` bucket. Reading through the kerchunk index with zarr (not
  only building it and reading its ranges) is still to be verified.
- If the output creator stops chunking by month, partial reads get worse; we
  should ask them to keep the layout.
