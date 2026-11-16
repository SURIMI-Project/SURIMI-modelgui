# 0020 — The chunk index of an output file is built with h5py's chunk API and read by our own decoder, not with kerchunk and zarr

**Status:** Proposed
**Date:** 2026-11-06
**Supersedes:** the kerchunk part of [0009](0009-output-storage-and-ingestion.md). Everything else in 0009 stays (outputs read in place, nothing copied into the database, presigned downloads)
**Related:** [features/experiment-outputs](../features/experiment-outputs/README.md)

## Context

- ADR 0009 builds a chunk index (offset and size of every chunk in the `.nc`)
  so a chart or a map needs a few range requests instead of walking HDF5
  metadata. It named kerchunk to build it and zarr to read through it.
  Reading through the index with zarr was still "to be verified".
- The real output of run `77c1e2a4…` (bucket `oidc-<developer>`): every data
  variable is float32, chunked one month per chunk, with two filters,
  **shuffle then deflate level 1**, fill value `1e20`; unwritten cells are
  NaN. **Verified** 2026-11-06 with h5py over S3.
- h5py exposes every chunk's offset, size and filter mask
  (`dataset.id.get_chunk_info`). The 2026-11-03 benchmark already read chunks
  this way with its own reader. **Verified** 2026-11-03.

## Decision

- The worker builds the index with h5py over an fsspec file object (range
  reads, only HDF5 metadata): per variable, its shape, chunk shape, dtype,
  fill value, filter pipeline and, per stored chunk, the chunk coordinates,
  offset, size and filter mask. The axes (species, life stages, fleets,
  markets, time, lat, lon) are read once and stored in the same index. The
  index is JSON, compressed with zlib, in `experiment_outputs.chunk_index`.
- The API reads only through the index. It fetches the needed byte ranges
  (merged when closer than `OUTPUT_RANGE_MERGE_GAP_KB`), inflates them with
  `zlib`, undoes the shuffle with numpy, and fills absent chunks with NaN.
  A filter other than shuffle and deflate makes indexing fail with a clear
  error, instead of returning wrong numbers.
- `parser_version` is stored with each index; a new version re-indexes.

## Why

- Same result as kerchunk (the offsets and sizes), with two small libraries we
  need anyway (h5py, numpy) and no kerchunk, zarr or numcodecs.
- The decoder is about 40 lines and handles exactly the filters the output
  creator uses; an unexpected filter is caught instead of misread.
- h5py is only needed by the worker; the API decodes with zlib and numpy.

## Alternatives considered

| Option | Why not |
| --- | --- |
| kerchunk + zarr (ADR 0009) | Three more dependencies for the same offsets; reading through zarr was unverified |
| h5py on every API request | Walks HDF5 metadata with many small reads per request (1,701 for the charts, measured 2026-11-03) |
| netCDF4 library | Same metadata cost, and it cannot read from an fsspec file object |

## Consequences

- If the output creator adds a filter (for example zstd), indexing fails with
  "unsupported filter" until the decoder learns it.
- The index format is ours: a change to it is a new `parser_version`.
