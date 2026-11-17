"""Reading a box of a variable through the chunk index (ADR 0009, ADR 0020).

Only the chunks that overlap the box are fetched, neighbouring ranges merged
into one request when closer than OUTPUT_RANGE_MERGE_GAP_KB. Compressed chunk
bytes are kept in an LRU bounded by OUTPUT_CHUNK_CACHE_MB; they are inflated
per request and dropped after it, so memory stays fixed.
"""

from __future__ import annotations

import itertools
import threading
import uuid
import zlib
from collections import OrderedDict
from collections.abc import Sequence

import numpy as np
import numpy.typing as npt

from surimi_backend.outputs.index import OutputIndex, Variable, unpack
from surimi_backend.outputs.storage import OutputStorage

Array = npt.NDArray[np.float64]


class ChunkCache:
    """LRU of compressed chunk bytes, bounded in bytes. Thread-safe: reads
    run in worker threads."""

    def __init__(self, max_bytes: int) -> None:
        self.max_bytes = max_bytes
        self.used = 0
        self._items: OrderedDict[tuple[uuid.UUID, str, int], bytes] = OrderedDict()
        self._lock = threading.Lock()

    def get(self, key: tuple[uuid.UUID, str, int]) -> bytes | None:
        with self._lock:
            value = self._items.get(key)
            if value is not None:
                self._items.move_to_end(key)
            return value

    def put(self, key: tuple[uuid.UUID, str, int], value: bytes) -> None:
        if len(value) > self.max_bytes:
            return
        with self._lock:
            if key in self._items:
                return
            self._items[key] = value
            self.used += len(value)
            while self.used > self.max_bytes:
                _, dropped = self._items.popitem(last=False)
                self.used -= len(dropped)


def unshuffle(data: bytes, itemsize: int) -> bytes:
    """Undo HDF5's shuffle filter: the bytes are stored plane by plane."""
    if itemsize <= 1:
        return data
    n = len(data) // itemsize
    head = np.frombuffer(data, dtype=np.uint8, count=n * itemsize)
    out = head.reshape(itemsize, n).T.tobytes()
    return out + data[n * itemsize :]


def decode(raw: bytes, var: Variable, mask: int) -> Array:
    """One stored chunk to a float64 array of the chunk shape; fill → NaN.
    Filters are undone in reverse order; a bit set in `mask` means HDF5
    skipped that filter for this chunk."""
    data = raw
    itemsize = np.dtype(var.dtype).itemsize
    for position in range(len(var.filters) - 1, -1, -1):
        if mask & (1 << position):
            continue
        name = var.filters[position]
        if name == "deflate":
            data = zlib.decompress(data)
        elif name == "shuffle":
            data = unshuffle(data, itemsize)
    stored = np.frombuffer(data, dtype=var.dtype).reshape(var.chunks)
    values = stored.astype(np.float64)
    # Exact match with the fill value: +inf is data (a broken value to count),
    # not "never written".
    values[stored == np.array(var.fill, dtype=var.dtype)] = np.nan
    return values


def merge_ranges(ranges: Sequence[tuple[int, int]], gap: int) -> list[tuple[int, int]]:
    merged: list[tuple[int, int]] = []
    for start, end in sorted(ranges):
        if merged and start - merged[-1][1] <= gap:
            merged[-1] = (merged[-1][0], max(merged[-1][1], end))
        else:
            merged.append((start, end))
    return merged


class OutputReader:
    def __init__(self, storage: OutputStorage, *, cache_mb: int, merge_gap_kb: int) -> None:
        self.storage = storage
        self.cache = ChunkCache(cache_mb * 1024 * 1024)
        self.gap = merge_gap_kb * 1024
        self._indexes: OrderedDict[tuple[uuid.UUID, str], OutputIndex] = OrderedDict()
        self._lock = threading.Lock()

    def index(self, experiment_id: uuid.UUID, parser_version: str, blob: bytes) -> OutputIndex:
        key = (experiment_id, parser_version)
        with self._lock:
            found = self._indexes.get(key)
            if found is not None:
                self._indexes.move_to_end(key)
                return found
        parsed = unpack(blob)
        with self._lock:
            self._indexes[key] = parsed
            while len(self._indexes) > 32:
                self._indexes.popitem(last=False)
        return parsed

    def read_box_sync(
        self, uri: str, experiment_id: uuid.UUID, var: Variable, box: Sequence[slice]
    ) -> Array:
        """Values of `var[box]` (each slice with explicit start and stop),
        NaN where nothing was written."""
        starts = [s.start for s in box]
        stops = [s.stop for s in box]
        out = np.full([b - a for a, b in zip(starts, stops, strict=True)], np.nan)
        spans = [
            range(a // c, (b - 1) // c + 1)
            for a, b, c in zip(starts, stops, var.chunks, strict=True)
        ]
        wanted = list(itertools.product(*spans))
        raw: dict[tuple[int, ...], bytes] = {}
        missing: list[tuple[tuple[int, ...], int]] = []
        for coords in wanted:
            flat = var.flat(coords)
            if flat not in var.table:
                continue  # never written: stays NaN
            cached = self.cache.get((experiment_id, var.name, flat))
            if cached is None:
                missing.append((coords, flat))
            else:
                raw[coords] = cached
        if missing:
            spans_needed = [
                (var.table[f].offset, var.table[f].offset + var.table[f].size) for _, f in missing
            ]
            merged = merge_ranges(spans_needed, self.gap)
            blobs = self.storage.read_ranges_sync(uri, merged)
            for coords, flat in missing:
                chunk = var.table[flat]
                for (start, end), blob in zip(merged, blobs, strict=True):
                    if start <= chunk.offset and chunk.offset + chunk.size <= end:
                        piece = blob[chunk.offset - start : chunk.offset - start + chunk.size]
                        raw[coords] = piece
                        self.cache.put((experiment_id, var.name, flat), piece)
                        break
        for coords, piece in raw.items():
            values = decode(piece, var, var.table[var.flat(coords)].mask)
            source: list[slice] = []
            target: list[slice] = []
            for coord, size, a, b in zip(coords, var.chunks, starts, stops, strict=True):
                lo = max(coord * size, a)
                hi = min((coord + 1) * size, b)
                source.append(slice(lo - coord * size, hi - coord * size))
                target.append(slice(lo - a, hi - a))
            out[tuple(target)] = values[tuple(source)]
        return out
