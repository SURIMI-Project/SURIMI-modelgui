"""The chunk index of an output file (ADR 0020): per data variable its shape,
chunk shape, dtype, fill value, filter pipeline and, per stored chunk, where
it sits in the file; plus the decoded axes. Built once per run by the worker
with h5py over an fsspec file object (only HDF5 metadata is read); the API
reads through it with plain range requests.

Layout of the files (**Verified** 2026-11-06 on run `77c1e2a4…`): float32,
one month per chunk, shuffle then deflate level 1, fill 1e20, unwritten cells
NaN; axes `species_code` + `species_life_stage`, `fleet_country_code` +
`fleet_gear_code`, `market_code`, `price_category_code`, `time` (seconds since
1970), `lat`, `lon`.
"""

from __future__ import annotations

import json
import zlib
from dataclasses import dataclass
from typing import Any

PARSER_VERSION = "1"
SUPPORTED_FILTERS = {1: "deflate", 2: "shuffle"}  # HDF5 filter ids


class OutputLayoutError(ValueError):
    """The file does not have the layout this parser knows."""


def pack(index: dict[str, Any]) -> bytes:
    return zlib.compress(json.dumps(index, separators=(",", ":")).encode(), 6)


# --- reading (API) -------------------------------------------------------------------


@dataclass(frozen=True, slots=True)
class Chunk:
    offset: int
    size: int
    mask: int


@dataclass(frozen=True)
class Variable:
    name: str
    dims: tuple[str, ...]
    shape: tuple[int, ...]
    chunks: tuple[int, ...]
    dtype: str
    fill: float
    filters: tuple[str, ...]
    units: str
    table: dict[int, Chunk]

    @property
    def grid(self) -> tuple[int, ...]:
        return tuple(-(-n // c) for n, c in zip(self.shape, self.chunks, strict=True))

    def flat(self, coords: tuple[int, ...]) -> int:
        flat = 0
        for coord, n in zip(coords, self.grid, strict=True):
            flat = flat * n + coord
        return flat


@dataclass(frozen=True)
class OutputIndex:
    parser_version: str
    size: int
    axes: dict[str, Any]
    variables: dict[str, Variable]

    @property
    def months(self) -> list[str]:
        months: list[str] = self.axes["time"]
        return months


def unpack(blob: bytes) -> OutputIndex:
    raw = json.loads(zlib.decompress(blob))
    variables = {
        name: Variable(
            name=name,
            dims=tuple(v["dims"]),
            shape=tuple(v["shape"]),
            chunks=tuple(v["chunks"]),
            dtype=v["dtype"],
            fill=v["fill"],
            filters=tuple(v["filters"]),
            units=v["units"],
            table={e[0]: Chunk(e[1], e[2], e[3]) for e in v["entries"]},
        )
        for name, v in raw["variables"].items()
    }
    return OutputIndex(raw["parser_version"], raw["size"], raw["axes"], variables)
