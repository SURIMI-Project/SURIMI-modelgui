"""Builds the chunk index of an output file (ADR 0020). Worker only: the API
reads through the index (`outputs/index.py`) and never needs h5py."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from typing import IO, Any

import h5py

from surimi_backend.outputs.index import PARSER_VERSION, SUPPORTED_FILTERS, OutputLayoutError


def _strings(dataset: Any) -> list[str]:
    return [v.decode() if isinstance(v, bytes) else str(v) for v in dataset[:]]


def _months(dataset: Any) -> list[str]:
    units = dataset.attrs.get("units", b"")
    units = units.decode() if isinstance(units, bytes) else str(units)
    step, _, origin = units.partition(" since ")
    seconds = {"seconds": 1, "minutes": 60, "hours": 3600, "days": 86400}.get(step.strip())
    if seconds is None or not origin:
        raise OutputLayoutError(f"time units {units!r} not understood")
    base = datetime.fromisoformat(origin.strip().replace(" ", "T")).replace(tzinfo=UTC)
    return [(base + timedelta(seconds=float(v) * seconds)).strftime("%Y-%m") for v in dataset[:]]


def _dims(dataset: Any) -> list[str]:
    names = []
    for dim in dataset.dims:
        if len(dim):
            names.append(dim[0].name.lstrip("/"))
        else:
            names.append(dim.label or "?")
    return names


def _filters(dataset: Any) -> list[str]:
    plist = dataset.id.get_create_plist()
    out = []
    for i in range(plist.get_nfilters()):
        code = plist.get_filter(i)[0]
        if code not in SUPPORTED_FILTERS:
            raise OutputLayoutError(f"{dataset.name}: unsupported HDF5 filter {code}")
        out.append(SUPPORTED_FILTERS[code])
    return out


def _chunks(dataset: Any) -> list[list[int]]:
    """[[flat grid index, byte offset, size, filter mask], …]"""
    chunk_shape = dataset.chunks
    grid = [-(-n // c) for n, c in zip(dataset.shape, chunk_shape, strict=True)]
    entries: list[list[int]] = []

    def add(info: Any) -> None:
        coords = [o // c for o, c in zip(info.chunk_offset, chunk_shape, strict=True)]
        flat = 0
        for coord, n in zip(coords, grid, strict=True):
            flat = flat * n + coord
        entries.append([flat, int(info.byte_offset), int(info.size), int(info.filter_mask)])

    if hasattr(dataset.id, "chunk_iter"):
        dataset.id.chunk_iter(add)
    else:  # older HDF5
        for i in range(dataset.id.get_num_chunks()):
            add(dataset.id.get_chunk_info(i))
    entries.sort()
    return entries


def build_index(handle: IO[bytes], size: int) -> dict[str, Any]:
    with h5py.File(handle, "r") as f:
        axes: dict[str, Any] = {
            "time": _months(f["time"]),
            "species": [
                {"species_code": c, "life_stage": s}
                for c, s in zip(
                    _strings(f["species_code"]), _strings(f["species_life_stage"]), strict=True
                )
            ],
            "fleets": [
                {"country_code": c, "gear_code": g}
                for c, g in zip(
                    _strings(f["fleet_country_code"]), _strings(f["fleet_gear_code"]), strict=True
                )
            ],
            "markets": _strings(f["market_code"]) if "market_code" in f else [],
            "categories": _strings(f["price_category_code"]) if "price_category_code" in f else [],
            "lat": [float(v) for v in f["lat"][:]],
            "lon": [float(v) for v in f["lon"][:]],
        }
        variables: dict[str, Any] = {}
        for name, dataset in f.items():
            if not isinstance(dataset, h5py.Dataset) or dataset.ndim < 2 or dataset.chunks is None:
                continue
            if dataset.dtype.kind != "f":
                continue
            units = dataset.attrs.get("units", b"")
            variables[name] = {
                "dims": _dims(dataset),
                "shape": list(dataset.shape),
                "chunks": list(dataset.chunks),
                "dtype": dataset.dtype.str,
                "fill": float(dataset.fillvalue),
                "filters": _filters(dataset),
                "units": units.decode() if isinstance(units, bytes) else str(units),
                "entries": _chunks(dataset),
            }
    return {"parser_version": PARSER_VERSION, "size": size, "axes": axes, "variables": variables}
