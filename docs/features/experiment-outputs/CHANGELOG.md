# Experiment outputs — changelog

Newest first.

## 2026-11-16 — Download links last 1 hour

**Status:** built. Ruff, format, mypy strict clean; **288 tests pass, all integration tests included** (PostgreSQL 17 in Docker), 2026-11-16.

Asked by the user, 2026-11-16: download the experiment's `.nc` through a
presigned link that expires in 1 hour.

- `core/config.py`: `PRESIGNED_URL_TTL_SECONDS` defaults to 3600 (was 900)
  and accepts 60 to 604800 (7 days, the longest an S3 SigV4 signature lives).
- `outputs/router.py`: summaries of `/download` and `/download-url` say 1 hour.
- `deployments/compose.yml` passes `PRESIGNED_URL_TTL_SECONDS` (default 3600);
  `deployments/.env.example` documents it.
- Tests: `tests/test_outputs_read.py` (`X-Amz-Expires=3600`; 59 and 604801
  refused).
- Console: a **Download .nc** button per completed experiment
  ([backend-console CHANGELOG](../backend-console/CHANGELOG.md)).
- **Verified** 2026-11-16 on the compose stack against `user-<developer>` and
  its bucket, completed run `93b34a3f…` (19.8 MB): the signed link has
  `X-Amz-Expires=3600`; a ranged GET through it answers `206` with
  `Content-Disposition: attachment` and the HDF5 signature; the same URL
  without its signature answers `403`. The button itself was not clicked in a
  browser.

---

## 2026-11-12 — Presigned link as JSON; results move the experiment to `completed`

**Status:** built (backend).

- `GET /api/v1/experiments/{id}/outputs/download-url?file=nc|bin` returns
  `{file, file_name, size_bytes, url, presigned, expires_at}`: the presigned
  S3 link (valid `PRESIGNED_URL_TTL_SECONDS`, 900 by default) instead of a
  redirect. Same role and state checks and the same `outputs.downloaded` audit
  row as `/download`, now shared in `_checked_download`. Local mode: `url` is
  the `/download` path, `presigned` false, `expires_at` null.
- `outputs/indexer.py`: an indexed run moves its experiment from
  `copying_results` to `completed` (`completed_at`, event
  `experiment.status_changed`); no file or an unreadable one moves it to
  `failed` (error `results: …`). A re-index of results that were already
  there still emits `experiment.outputs_ready` / `outputs_failed`. Admin
  re-index of a `failed` run sets it `copying_results` again and restarts the
  wait.
- Tests: `tests/test_outputs_api.py` (download-url in local mode: body,
  404 for another member, 403 for `.bin`, audit row; `completed` after
  indexing; missing file → `failed` → re-index → `completed`),
  `tests/test_outputs_read.py::test_presigned_link_is_for_the_public_endpoint_and_expires`
  (the link is signed for `S3_PUBLIC_ENDPOINT`, 900 s, with the file name).
- **Verified** 2026-11-12: Ruff, format, mypy strict clean; 235 tests pass.
- **Verified** 2026-11-12 against bucket `oidc-<developer>` on
  `minio.dive.edito.eu`, through the compose API, run `5067d5f7`:
  - `/download-url` for `nc` and `bin` gave 200, `presigned: true`, and
    `expires_at` 900 s ahead.
  - Each link, opened without our token, returned 206 with the full file size
    (19,843,649 and 87,166,044 bytes); the `.nc` starts with the HDF5
    signature.
  - A link with an altered signature got 403. No token: 401; `file=csv`: 422.
  - The 302 `/download` still points at MinIO.
  - One `outputs.downloaded` audit row per granted request (3), none for the
    refused ones.
  - The new run `efe96165` got a link once `completed`.

## 2026-11-06 — Index, charts, maps, report, downloads

**Status:** built (phase 6). The chunk index is built with h5py and read by
our own decoder ([ADR 0020](../../decisions/0020-own-chunk-index-built-with-h5py.md)).
Ruff, Ruff format and mypy strict clean; 229 tests pass, of them 61 new (integration tests against PostgreSQL 17 in Docker). `tests/test_outputs_read.py`: a file with the real layout read back
exactly through the index (edge chunks, an unwritten month), merged ranges
and the chunk cache, species totals over life stages, group biomass as one
member, cleaning counts, yearly sums and means, maps, the report.
`tests/test_outputs_api.py`: from a finished run to `ready`, series with
`ETag`/`304`, JSON and binary maps, ownership (404), `.bin` for admins,
audited download, re-index.

A bug the tests caught: the first decoder treated anything above `9e19` as
the fill value, which also hid `+inf`; fill is now matched exactly.

**Verified** 2026-11-06 against the EDITO bucket `oidc-<developer>`
(`OUTPUTS_URI=s3://oidc-<developer>/output_creator/experiments`), run
`77c1e2a4…` (19.8 MB, 13 months): indexed in the worker (index 17.8 KB);
report 6 infinite and 2 out-of-range prices, 9 infinite `sales_value` cells,
19 groups of species sharing one biomass series; series 0.09–0.34 s and maps
0.27 s (month) and 0.77 s (year) through nginx on a cold cache; HKE catch per
month equal to an independent h5py read (7292, 7059, 7125, … kg); presigned
link `206` on a range GET and `403` on PUT. Not verified: local-mode
downloads through nginx (`X-Accel-Redirect` is tested at the API only), memory
under a 512 MB limit, an MSE run's files.

`apps/backend/…`: `outputs/` (`models.py`, `storage.py`, `build.py`,
`index.py`, `read.py`, `queries.py`, `indexer.py`, `router.py`).
`deployments/`: outputs settings in `compose.yml` (shared with the worker),
the outputs folder mounted read-only, nginx `location /protected-outputs/`.

**Deploy:** `OUTPUTS_URI` and `S3_*` for the bucket; the credentials go in
the environment, never in the repo.

---

## 2026-11-06 — Indexed layout: per-species chunks, yearly data, tools, map payload

- Experiment, no application code. New `benchmark/indexed_chunks.py` and
  `benchmark/indexed_yearly.py`; `make_indexed.py` and `indexed_yearly.py` add
  coordinate variables `species` and `fleet` and CF attributes on `lat`/`lon`;
  `verify_indexed.py` allows those attributes. `format-benchmark-2026-11-03.md`:
  sections on per-species chunks, yearly data with the index, tools, and the
  map payload for the browser; the proposed `maps.nc` becomes the yearly
  indexed file. New `output_folder/…/derived/yearly_indexed.nc` (8.0 MB).
- Verified on run `99c1e2a4…`: chunks of 12 months × 4096 points read 0.28 MB
  for one species and year instead of 3.06 MB (file 78 → 88 MB). Yearly data
  with the index is 6.9 MB with fleets kept (16–24 MB without the index).
  cf-xarray rebuilds the grid exactly; NCO, CDO, netCDF-C and netCDF-Java read
  the file but do not rebuild it; GDAL reads it as a table. The original file
  has no attributes on `lat`/`lon`, so CDO sees no lon/lat grid and
  netCDF-Java finds no plottable grid in it either. Map payload for one
  species, 17 years: 37.6 KB as sparse JSON against 57.9 KB as a dense grid
  (gzipped).
- New `benchmark/query_indexed.py` and a "Querying the indexed file" section:
  six queries (species map, species per fleet, one cell, a lat/lon box, yearly
  mean, pandas table), each verified equal to the same query on the original.
- Not verified: the Panoply application itself (only its library), QGIS
  itself (only GDAL), reads over S3 for the indexed layouts.

## 2026-11-06 — Monthly file indexed by species × fleet × lat × lon

- Experiment, no application code. New `benchmark/make_indexed.py` and
  `benchmark/verify_indexed.py`; `format-benchmark-2026-11-03.md` gains
  "Where the space goes in the original file" and "Monthly file indexed by
  species × fleet × lat × lon"; `benchmark/README.md` lists both scripts.
- Verified on run `99c1e2a4…`: the four maps fill 99% of the 311 MB file;
  only 846 of 8,938 cells and 40,980 of 7.7 million species × fleet × cell
  combinations ever hold a value. Indexing the maps (CF compression by
  gathering) gives `output_folder/…/derived/indexed.nc`, 81.5 MB (−74%), with
  every map identical to the source in all 205 months and every other variable
  identical with its units.
- Not verified: reading one species from per-species chunks, tools other than
  xarray, yearly data combined with the index.

## 2026-11-05 — Output level per metric replaces "shared series counted once"

- Design only, no code. `README.md`: the functional-group rule now follows the
  [scenario catalog](../scenario-catalog/README.md): biomass at group level
  (one member's series), catch, discards, sales and price at species level;
  the series and map endpoints will take `level`.
  [ADR 0017](../../decisions/0017-scenario-catalog-from-partner-config.md).
- Verified on run `99c1e2a4…` with h5py and `northwestern_med.semantics`
  (SURIMI-Ecopath `156c130`): members of 19 of 20 multi-species groups have
  identical `biomass_total`; all 20 differ in `gross_catch_total`. Not checked:
  the gridded `biomass` and `gross_catch` variables, and other runs.
