"""Build the storage variants compared in the format benchmark.

Source: run 99c1e2a4 (205 months, 2013-01 .. 2030-01).
Step 1 writes yearly aggregates (2013..2029, 17 full years) to raw float32
memmaps; step 2 writes every variant and records size, objects, build time.
Usage: python build.py <source.nc> <work dir> [variant ...]
"""

import json
import os
import shutil
import sys
import time

import netCDF4
import numpy as np
import zarr
from zarr.codecs import BloscCodec, BytesCodec, ShardingCodec

SRC, WORK = sys.argv[1], sys.argv[2]
ONLY = set(sys.argv[3:])
os.makedirs(WORK, exist_ok=True)
AGG = os.path.join(WORK, "annual_raw")
OUT = os.path.join(WORK, "variants")
os.makedirs(AGG, exist_ok=True)
os.makedirs(OUT, exist_ok=True)

src = netCDF4.Dataset(SRC)
src.set_auto_mask(False)
FILL = 1e20
NT = len(src.dimensions["time"])
YEARS = list(range(2013, 2030))
NY = len(YEARS)
MAPS5 = ("gross_catch", "live_discards", "dead_discards")
TOT3 = ("gross_catch_total", "live_discards_total", "dead_discards_total")
SALES = ("sales_value", "sales_quantity")
MEAN_VARS = {"biomass", "biomass_total", "price", "fishing_activity"}
ALL = MAPS5 + ("biomass",) + TOT3 + ("biomass_total", "price") + SALES + ("fishing_activity",)
STR = ("species_code", "species_life_stage", "fleet_gear_code", "fleet_country_code", "market_code", "price_category_code")
LAT = src["lat"][:]
LON = src["lon"][:]


def read(name, t0, t1):
    a = src[name][t0:t1].astype("f4")
    a[np.isfinite(a) & (a >= 9e19)] = np.nan  # fill value only; keep +-inf so it can be counted
    return a


def agg(x, mean):
    """Yearly sum or mean over axis 0; all-missing stays missing, not 0."""
    with np.errstate(invalid="ignore", divide="ignore"):
        n = np.isfinite(x).sum(0) + np.isinf(x).sum(0)
        s = np.nansum(x, 0, dtype="f8")
        r = s / np.maximum(n, 1) if mean else s
    r = r.astype("f4")
    r[n == 0] = np.nan
    return r


def mm(name, shape=None):
    p = os.path.join(AGG, name + ".f32")
    if shape is None:
        shape = tuple(json.load(open(p + ".json")))
        return np.memmap(p, "f4", "r", shape=shape)
    json.dump(list(shape), open(p + ".json", "w"))
    return np.memmap(p, "f4", "w+", shape=shape)


# ---------- step 1: yearly aggregates ----------
if not os.path.exists(os.path.join(AGG, "done")):
    t = time.time()
    for name in ALL:
        shp = src[name].shape
        out = mm(name, (NY,) + shp[1:])
        for y in range(NY):
            out[y] = agg(read(name, 12 * y, 12 * y + 12), name in MEAN_VARS)
        out.flush()
        del out
        print("aggregated", name, round(time.time() - t, 1), "s", flush=True)
    open(os.path.join(AGG, "done"), "w").write(str(time.time() - t))


# ---------- variant writers ----------
def strings():
    return {k: np.array(src[k][:], dtype=object) for k in STR}


def nc_write(path, vars_, time_name, time_vals, time_units=None, zlib=True, level=4, shuffle=True, quantize=None):
    if os.path.exists(path):
        os.remove(path)
    d = netCDF4.Dataset(path, "w", format="NETCDF4")
    d.createDimension(time_name, len(time_vals))
    for k, n in (("species", 96), ("fleet", 9), ("lat", 82), ("lon", 109), ("market", 38), ("category", 1)):
        d.createDimension(k, n)
    tv = d.createVariable(time_name, "f8" if time_units else "i4", (time_name,))
    tv[:] = time_vals
    if time_units:
        tv.units = time_units
    d.createVariable("lat", "f4", ("lat",))[:] = LAT
    d.createVariable("lon", "f4", ("lon",))[:] = LON
    dims_of = {"species_code": "species", "species_life_stage": "species", "fleet_gear_code": "fleet", "fleet_country_code": "fleet", "market_code": "market", "price_category_code": "category"}
    for k, v in strings().items():
        x = d.createVariable(k, str, (dims_of[k],))
        x[:] = v
    for name, dims, chunks, slabs, step in vars_:
        kw = dict(zlib=zlib, complevel=level, shuffle=shuffle, chunksizes=chunks, fill_value=np.float32(np.nan))
        if quantize and name in quantize:
            kw.update(significant_digits=quantize[name], quantize_mode="BitRound")
        v = d.createVariable(name, "f4", dims, **kw)
        for t0, data in slabs():
            v[t0 : t0 + data.shape[0]] = data
    d.close()


def zarr_write(path, vars_, time_name, time_vals, shards=None, clevel=3, bitround=None):
    if os.path.exists(path):
        shutil.rmtree(path)
    root = zarr.open_group(path, mode="w", zarr_format=3)
    comp = BloscCodec(cname="zstd", clevel=clevel, shuffle="shuffle")
    root.create_array(time_name, data=np.asarray(time_vals), chunks=(len(time_vals),))
    root.create_array("lat", data=LAT, chunks=(82,))
    root.create_array("lon", data=LON, chunks=(109,))
    for k, v in strings().items():
        root.attrs[k] = [str(s) for s in v]
    for name, dims, chunks, slabs, step in vars_:
        shape = (len(time_vals),) + tuple(SHAPE[d] for d in dims[1:])
        kw = dict(shape=shape, chunks=chunks, dtype="f4", fill_value=np.float32(np.nan), dimension_names=dims, compressors=comp)
        if bitround and name in bitround:
            from numcodecs.zarr3 import BitRound

            kw["filters"] = [BitRound(keepbits=bitround[name])]
        if shards:
            kw["shards"] = tuple(shape[i] if shards == "all" else shards(name, shape)[i] for i in range(len(shape)))
        a = root.create_array(name, **kw)
        for t0, data in slabs():
            a[t0 : t0 + data.shape[0]] = data
    zarr.consolidate_metadata(path)


SHAPE = {"species": 96, "fleet": 9, "lat": 82, "lon": 109, "market": 38, "category": 1}


def monthly_slabs(name, step):
    def it():
        for t0 in range(0, NT, step):
            yield t0, read(name, t0, min(NT, t0 + step))

    return it


def annual_slabs(name, step=NY, transform=None):
    def it():
        a = mm(name)
        for t0 in range(0, NY, step):
            x = np.array(a[t0 : t0 + step])
            yield t0, transform(x) if transform else x

    return it


def dims_of(name, tname):
    return (tname,) + src[name].dimensions[1:]


def orig_chunks(name):
    return src[name].chunking()


def species_chunks(name, tlen):
    c = list(src[name].shape)
    c[0] = tlen
    c[1] = 1
    if len(c) == 2:  # (time, species) or (time, fleet): one chunk for all
        c[1] = src[name].shape[1]
    if name in ("price", "sales_value", "sales_quantity") or name.endswith("_total"):
        c[1] = src[name].shape[1]  # small: whole variable in one chunk per time block
    return tuple(c)


TIME_UNITS = "seconds since 1970-01-01 00:00:00"
TVALS = src["time"][:]


def monthly(chunker, step):
    return [(n, dims_of(n, "time"), chunker(n), monthly_slabs(n, step), step) for n in ALL]


def annual(chunker):
    return [(n, dims_of(n, "year"), chunker(n), annual_slabs(n), NY) for n in ALL]


# Dashboard product: yearly, maps summed over fleets, landings added, cleaned.
def clean(x, bound=None):
    x = x.copy()
    x[~np.isfinite(x)] = np.nan
    if bound is not None:
        x[x > bound] = np.nan
    return x


def fleet_sum(name):
    def it():
        a = mm(name)
        x = np.empty((NY, 96, 82, 109), "f4")
        for y in range(NY):
            v = np.array(a[y])  # species, fleet, lat, lon
            n = np.isfinite(v).sum(1)
            r = np.nansum(v, 1)
            r[n == 0] = np.nan
            x[y] = r
        yield 0, x

    return it


def landings_map():
    def it():
        g, dd, lv = mm("gross_catch"), mm("dead_discards"), mm("live_discards")
        x = np.empty((NY, 96, 82, 109), "f4")
        for y in range(NY):
            gy = np.array(g[y])
            r = np.nansum(gy - np.nan_to_num(np.array(dd[y])) - np.nan_to_num(np.array(lv[y])), 1)
            r[np.isfinite(gy).sum(1) == 0] = np.nan
            x[y] = r
        yield 0, x

    return it


def landings_total():
    def it():
        g, dd, lv = mm("gross_catch_total"), mm("dead_discards_total"), mm("live_discards_total")
        g = np.array(g)
        yield 0, g - np.nan_to_num(np.array(dd)) - np.nan_to_num(np.array(lv))

    return it


def dash_vars(map_chunks):
    M = ("year", "species", "lat", "lon")
    out = [
        ("biomass", M, map_chunks, annual_slabs("biomass"), NY),
        ("gross_catch", M, map_chunks, fleet_sum("gross_catch"), NY),
        ("dead_discards", M, map_chunks, fleet_sum("dead_discards"), NY),
        ("live_discards", M, map_chunks, fleet_sum("live_discards"), NY),
        ("landings", M, map_chunks, landings_map(), NY),
        ("biomass_total", ("year", "species"), (NY, 96), annual_slabs("biomass_total"), NY),
        ("landings_total", ("year", "species", "fleet"), (NY, 96, 9), landings_total(), NY),
        ("price", ("year", "species", "market", "category"), (NY, 96, 38, 1), annual_slabs("price", transform=lambda x: clean(x, 1e3)), NY),
        ("sales_value", ("year", "species", "fleet", "market"), (NY, 96, 9, 38), annual_slabs("sales_value", transform=clean), NY),
        ("sales_quantity", ("year", "species", "fleet", "market"), (NY, 96, 9, 38), annual_slabs("sales_quantity", transform=clean), NY),
        ("fishing_activity", ("year", "fleet"), (NY, 9), annual_slabs("fishing_activity"), NY),
    ]
    for n in TOT3:
        out.append((n, ("year", "species", "fleet"), (NY, 96, 9), annual_slabs(n), NY))
    return out


def size_of(p):
    if os.path.isfile(p):
        return os.path.getsize(p), 1
    n = b = 0
    for r, _, fs in os.walk(p):
        for f in fs:
            n += 1
            b += os.path.getsize(os.path.join(r, f))
    return b, n


# netCDF4 BitRound: significant_digits counts binary digits (bits)
Q = {"biomass": 12, "gross_catch": 12, "dead_discards": 12, "live_discards": 12, "landings": 12}
QB = {k: 12 for k in Q}  # 12 mantissa bits ~ 3.6 significant digits

VARIANTS = {
    # monthly, full content
    "M2_nc_origchunks_z4": lambda p: nc_write(p, monthly(orig_chunks, 6), "time", TVALS, TIME_UNITS),
    "M3_zarr_origchunks": lambda p: zarr_write(p, monthly(orig_chunks, 6), "time", TVALS),
    "M4_nc_speciesyear_z4": lambda p: nc_write(p, monthly(lambda n: species_chunks(n, 12), 12), "time", TVALS, TIME_UNITS),
    "M5_zarr_speciesyear": lambda p: zarr_write(p, monthly(lambda n: species_chunks(n, 12), 12), "time", TVALS),
    # yearly, full content
    "A1_nc_origchunks_gz1": lambda p: nc_write(p, annual(lambda n: (1,) + tuple(orig_chunks(n)[1:])), "year", YEARS, level=1),
    "A2_nc_species_z4": lambda p: nc_write(p, annual(lambda n: species_chunks(n, NY)), "year", YEARS),
    "A3_zarr_species": lambda p: zarr_write(p, annual(lambda n: species_chunks(n, NY)), "year", YEARS),
    # yearly dashboard product
    "D1_nc_dash_species": lambda p: nc_write(p, dash_vars((NY, 1, 82, 109)), "year", YEARS),
    "D2_zarr_dash_species": lambda p: zarr_write(p, dash_vars((NY, 1, 82, 109)), "year", YEARS),
    "D3_zarr_dash_sharded": lambda p: zarr_write(p, dash_vars((NY, 1, 82, 109)), "year", YEARS, shards="all"),
    "D4_nc_dash_yearmaps": lambda p: nc_write(p, dash_vars((1, 1, 82, 109)), "year", YEARS),
    "D5_zarr_dash_yearmaps": lambda p: zarr_write(p, dash_vars((1, 1, 82, 109)), "year", YEARS),
    "D6_nc_dash_quantized": lambda p: nc_write(p, dash_vars((NY, 1, 82, 109)), "year", YEARS, quantize=Q),
    "D7_zarr_dash_bitround": lambda p: zarr_write(p, dash_vars((NY, 1, 82, 109)), "year", YEARS, bitround=QB),
}
EXT = lambda k: ".zarr" if "zarr" in k else ".nc"

res_path = os.path.join(WORK, "build_results.json")
res = json.load(open(res_path)) if os.path.exists(res_path) else {}
b, n = size_of(SRC)
res["M1_original"] = {"bytes": b, "objects": n, "seconds": None}
for k, fn in VARIANTS.items():
    if ONLY and k not in ONLY:
        continue
    p = os.path.join(OUT, k + EXT(k))
    t = time.time()
    fn(p)
    dt = time.time() - t
    b, n = size_of(p)
    res[k] = {"bytes": b, "objects": n, "seconds": round(dt, 1)}
    print(k, round(b / 1e6, 2), "MB", n, "objects", round(dt, 1), "s", flush=True)
    json.dump(res, open(res_path, "w"), indent=1)

import psutil  # noqa: E402

mem = psutil.Process().memory_info()
print("peak memory MB", round(getattr(mem, "peak_wset", mem.rss) / 1e6))  # peak_wset exists on Windows only
