"""Access benchmark: what the dashboard reads, against each storage variant on S3 (MinIO).

Every S3 call is counted (patched S3FileSystem._call_s3). Each scenario starts
cold (new reader, no cache). The chunk index of a NetCDF file is built before
timing, as ADR 0009 stores it in the database.
Usage: python access.py <work dir> <label> [variant ...]
"""

import asyncio
import bisect
import collections
import json
import os
import sys
import time
import zlib

import h5py
import netCDF4
import numpy as np
import s3fs
import zarr
from zarr.storage import FsspecStore

WORK, LABEL = sys.argv[1], sys.argv[2]
ONLY = sys.argv[3:]
BUCKET = "bench"
ENDPOINT = os.environ.get("BENCH_S3_ENDPOINT", "http://127.0.0.1:9100")
SRC = os.environ.get("BENCH_SRC", "output_folder/experiments/99c1e2a4-5d3f-4e8a-9c6b-1f2a3d4e5f60/99c1e2a4-5d3f-4e8a-9c6b-1f2a3d4e5f60.nc")

COUNT = collections.Counter()
_orig = s3fs.S3FileSystem._call_s3


async def _counted(self, method, *a, **kw):
    r = await _orig(self, method, *a, **kw)
    name = getattr(method, "__name__", str(method))
    COUNT["requests"] += 1
    COUNT[name] += 1
    if isinstance(r, dict) and "ContentLength" in r and name == "get_object":
        COUNT["bytes"] += int(r["ContentLength"])
    return r


s3fs.S3FileSystem._call_s3 = _counted


def new_fs():
    return s3fs.S3FileSystem(key="bench", secret="benchbench", client_kwargs={"endpoint_url": ENDPOINT}, skip_instance_cache=True, use_listings_cache=False)


# ---------- species selection: everything under one species code, as the dashboard does ----------
_s = netCDF4.Dataset(SRC)
CODES = [str(x) for x in _s["species_code"][:]]
_s.close()
SPECIES = "HKE"
ROWS = [i for i, c in enumerate(CODES) if c == SPECIES]
S0, S1 = min(ROWS), max(ROWS) + 1
YEAR = 2020
Y = YEAR - 2013
MONTHS = (12 * Y, 12 * Y + 12)
NY = 17
NM = 12 * NY  # monthly reads stop at 2029-12, as the yearly product does


# ---------- readers ----------
def merge(ranges, gap=64 * 1024):
    ranges = sorted(ranges)
    out = []
    for o, n in ranges:
        if out and o <= out[-1][0] + out[-1][1] + gap:
            po, pn = out[-1]
            out[-1] = (po, max(po + pn, o + n) - po)
        else:
            out.append((o, n))
    return out


def build_index(local_path):
    idx = {}
    with h5py.File(local_path, "r") as f:
        for name, ds in f.items():
            if not isinstance(ds, h5py.Dataset) or ds.dtype != np.float32 or ds.chunks is None:
                continue
            chunks = {}
            for i in range(ds.id.get_num_chunks()):
                c = ds.id.get_chunk_info(i)
                chunks[tuple(int(x) // s for x, s in zip(c.chunk_offset, ds.chunks))] = (int(c.byte_offset), int(c.size))
            idx[name] = {"shape": ds.shape, "chunks": ds.chunks, "shuffle": bool(ds.shuffle), "map": chunks}
    return idx


class IndexReader:
    """NetCDF read in place: chunk index + merged range requests (ADR 0009)."""

    def __init__(self, fs, path, index):
        self.fs, self.path, self.idx = fs, path, index

    def read_many(self, sels):
        plans = []
        wanted = []
        for var, t0, t1, s0, s1 in sels:
            v = self.idx[var]
            ch, shape = v["chunks"], v["shape"]
            rng = [range(t0 // ch[0], (t1 - 1) // ch[0] + 1), range(s0 // ch[1], (s1 - 1) // ch[1] + 1)] + [range(0, -(-shape[d] // ch[d])) for d in range(2, len(shape))]
            keys = [k for k in np.ndindex(*[len(r) for r in rng])]
            keys = [tuple(r[i] for r, i in zip(rng, k)) for k in keys]
            plans.append((var, t0, t1, s0, s1, rng, keys))
            wanted += [v["map"][k] for k in keys if k in v["map"]]
        merged = merge(set(wanted))
        if merged:
            blobs = self.fs.cat_ranges([self.path] * len(merged), [o for o, _ in merged], [o + n for o, n in merged])
        else:
            blobs = []
        starts = [mo for mo, _ in merged]
        out = []
        for var, t0, t1, s0, s1, rng, keys in plans:
            v = self.idx[var]
            ch, shape = v["chunks"], v["shape"]
            region = np.full([len(r) * c for r, c in zip(rng, ch)], np.nan, "f4")
            for k in keys:
                if k not in v["map"]:
                    continue
                o, n = v["map"][k]
                j = bisect.bisect_right(starts, o) - 1
                mo = starts[j]
                raw = zlib.decompress(memoryview(blobs[j])[o - mo : o - mo + n])
                if v["shuffle"]:
                    raw = np.frombuffer(raw, "u1").reshape(4, -1).T.copy().tobytes()
                a = np.frombuffer(raw, "<f4").reshape(ch)
                sl = tuple(slice((ki - r.start) * c, (ki - r.start + 1) * c) for ki, r, c in zip(k, rng, ch))
                region[sl] = a
            base = [r.start * c for r, c in zip(rng, ch)]
            sl = (slice(t0 - base[0], t1 - base[0]), slice(s0 - base[1], s1 - base[1])) + tuple(slice(0, shape[d]) for d in range(2, len(shape)))
            x = region[sl]
            x[x >= 9e19] = np.nan
            out.append(x)
        return out


class H5Reader:
    """NetCDF opened with h5py directly on S3 (s3fs file object, default cache)."""

    def __init__(self, fs, path):
        self.f = h5py.File(fs.open(path, "rb"), "r")

    def read_many(self, sels):
        out = []
        for var, t0, t1, s0, s1 in sels:
            x = self.f[var][t0:t1, s0:s1].astype("f4")
            x[x >= 9e19] = np.nan
            out.append(x)
        return out


class ZarrReader:
    def __init__(self, fs, path):
        opts = {"key": "bench", "secret": "benchbench", "client_kwargs": {"endpoint_url": ENDPOINT}, "skip_instance_cache": True}
        self.g = zarr.open_consolidated(f"s3://{path}", storage_options=opts, mode="r", zarr_format=3)

    def read_many(self, sels):
        arrays = {var: self.g[var] for var, *_ in sels}  # metadata comes from the consolidated zarr.json

        async def one(var, t0, t1, s0, s1):
            return await arrays[var]._async_array.getitem((slice(t0, t1), slice(s0, s1)))

        async def all_():
            return await asyncio.gather(*(one(*s) for s in sels))

        return [np.asarray(x) for x in zarr.core.sync.sync(all_())]


# ---------- what each dashboard action reads ----------
def scenarios(kind):
    """kind: monthly | annual | dash. Returns {scenario: [reads]} and the post-processing."""
    if kind == "monthly":
        T = (0, NM)
        Ym = MONTHS
        allyears = (0, NM)
        tot = ["biomass_total", "gross_catch_total", "dead_discards_total", "live_discards_total", "sales_quantity", "sales_value", "price"]
        maps_l = ["gross_catch", "dead_discards", "live_discards"]
    else:
        T = (0, NY)
        Ym = (Y, Y + 1)
        allyears = (0, NY)
        tot = ["biomass_total", "gross_catch_total", "dead_discards_total", "live_discards_total", "sales_quantity", "sales_value", "price"]
        maps_l = ["gross_catch", "dead_discards", "live_discards"]
        if kind == "dash":
            tot = ["biomass_total", "landings_total", "dead_discards_total", "sales_quantity", "sales_value", "price"]
            maps_l = ["landings"]
    r = lambda v, t: (v, t[0], t[1], S0, S1)
    return {
        "S0 open only (client, metadata)": [],
        "S1 page load: 5 yearly charts + 1 map":[r(v, T) for v in tot] + [r("biomass", Ym)],
        "S2 change year: biomass map": [r("biomass", Ym)],
        "S3 play all years: biomass maps": [r("biomass", allyears)],
        "S4 landings map, 1 year": [r(v, Ym) for v in maps_l],
        "S5 landings maps, all years": [r(v, allyears) for v in maps_l],
    }


def year_biomass_map(kind, arrays):
    """Value check: the yearly biomass map of the selected species and year."""
    a = arrays[-1] if len(arrays) > 1 else arrays[0]
    if kind == "monthly":
        with np.errstate(invalid="ignore"):
            n = np.isfinite(a).sum(0)
            m = np.nansum(a, 0, dtype="f8") / np.maximum(n, 1)
        m[n == 0] = np.nan
        return m.astype("f4")
    return a[0]


VARIANTS = {
    # name: (path in bucket, kind, reader)
    "M1_original/index": ("M1_original.nc", "monthly", "index"),
    "M1_original/h5py": ("M1_original.nc", "monthly", "h5py"),
    "M2_nc_origchunks_z4/index": ("M2_nc_origchunks_z4.nc", "monthly", "index"),
    "M3_zarr_origchunks": ("M3_zarr_origchunks.zarr", "monthly", "zarr"),
    "M4_nc_speciesyear_z4/index": ("M4_nc_speciesyear_z4.nc", "monthly", "index"),
    "M5_zarr_speciesyear": ("M5_zarr_speciesyear.zarr", "monthly", "zarr"),
    "A2_nc_species_z4/index": ("A2_nc_species_z4.nc", "annual", "index"),
    "A3_zarr_species": ("A3_zarr_species.zarr", "annual", "zarr"),
    "D1_nc_dash_species/index": ("D1_nc_dash_species.nc", "dash", "index"),
    "D1_nc_dash_species/h5py": ("D1_nc_dash_species.nc", "dash", "h5py"),
    "D2_zarr_dash_species": ("D2_zarr_dash_species.zarr", "dash", "zarr"),
    "D3_zarr_dash_sharded": ("D3_zarr_dash_sharded.zarr", "dash", "zarr"),
    "D4_nc_dash_yearmaps/index": ("D4_nc_dash_yearmaps.nc", "dash", "index"),
    "D5_zarr_dash_yearmaps": ("D5_zarr_dash_yearmaps.zarr", "dash", "zarr"),
}

fs = new_fs()
local = lambda p: SRC if p.startswith("M1_original") else os.path.join(WORK, "variants", p)

res_path = os.path.join(WORK, f"access_{LABEL}.json")
results = json.load(open(res_path)) if os.path.exists(res_path) else {}
check = {}
for name, (p, kind, how) in VARIANTS.items():
    if ONLY and not any(name.startswith(o) for o in ONLY):
        continue
    if not os.path.exists(local(p)):
        print("skip (not built)", name)
        continue
    key = f"{BUCKET}/{p}"
    if not fs.exists(key):
        fs.put(local(p), key, recursive=os.path.isdir(local(p)))
    index = build_index(local(p)) if how == "index" else None
    results[name] = {}
    for sc, sels in scenarios(kind).items():
        COUNT.clear()
        fsx = new_fs()
        t = time.perf_counter()
        rd = IndexReader(fsx, key, index) if how == "index" else H5Reader(fsx, key) if how == "h5py" else ZarrReader(fsx, key)
        arrays = rd.read_many(sels)
        dt = time.perf_counter() - t
        results[name][sc] = {"requests": COUNT["requests"], "bytes": COUNT["bytes"], "seconds": round(dt, 3)}
        if sc.startswith("S2"):
            check[name] = year_biomass_map(kind, arrays)
            np.save(os.path.join(WORK, "check_" + name.replace("/", "_") + ".npy"), check[name])
        print(f"{LABEL:6} {name:30} {sc:38} req={COUNT['requests']:5} MB={COUNT['bytes'] / 1e6:8.3f} s={dt:7.3f}", flush=True)
    json.dump(results, open(res_path, "w"), indent=1)

if check:
    ref_name = next(iter(check))
    ref = check[ref_name]
    for n, a in check.items():
        same = np.allclose(np.nansum(a, 0), np.nansum(ref, 0), rtol=1e-4, equal_nan=True)
        print("value check vs", ref_name, n, "OK" if same else "DIFFERENT", float(np.nansum(a)))
