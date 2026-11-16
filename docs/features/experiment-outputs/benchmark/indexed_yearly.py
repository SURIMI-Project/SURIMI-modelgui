"""Yearly data combined with the species x fleet x lat x lon index, and the map payload for the browser.

Y1: yearly, full content (fleets kept), maps indexed by species x fleet x lat x lon.
Y2: yearly dashboard maps (fleets summed, landings added), indexed by species x lat x lon.
Both are rebuilt and compared with the yearly aggregates written by build.py (step 1).
Then measures what one species' maps for every year cost to send to the browser.
Usage: python indexed_yearly.py <work dir of build.py> <source.nc> <out dir> [species, default HKE]
"""

import gzip
import json
import os
import sys

import netCDF4
import numpy as np

WORK, SRC, OUT = sys.argv[1], sys.argv[2], sys.argv[3]
SPECIES = sys.argv[4] if len(sys.argv) > 4 else "HKE"
AGG = os.path.join(WORK, "annual_raw")
os.makedirs(OUT, exist_ok=True)
YEARS = np.arange(2013, 2030, dtype="i4")
NY = len(YEARS)
src = netCDF4.Dataset(SRC)
codes = [str(c) for c in src["species_code"][:]]
LAT = src["lat"][:].astype("f8")
LON = src["lon"][:].astype("f8")
SMALL = ("gross_catch_total", "dead_discards_total", "live_discards_total", "biomass_total", "price", "sales_value", "sales_quantity", "fishing_activity")
STR = ("species_code", "species_life_stage", "fleet_gear_code", "fleet_country_code", "market_code", "price_category_code")


def mm(n):
    p = os.path.join(AGG, n + ".f32")
    return np.memmap(p, "f4", "r", shape=tuple(json.load(open(p + ".json"))))


def fleet_sum(a):
    n = np.isfinite(a).sum(2)
    r = np.nansum(a, 2)
    r[n == 0] = np.nan
    return r


def gather(full):
    flat = full.reshape(full.shape[0], -1)
    ix = np.nonzero((~np.isnan(flat)).any(0))[0].astype("i4")
    return ix, flat[:, ix]


def write(path, maps, compress, pchunk):
    """maps: {name: (point dim, index, values[year, point])}"""
    if os.path.exists(path):
        os.remove(path)
    o = netCDF4.Dataset(path, "w")
    o.Conventions = "CF-1.8"
    for k, n in (("year", NY), ("species", 96), ("fleet", 9), ("lat", 82), ("lon", 109), ("market", 38), ("category", 1)):
        o.createDimension(k, n)
    o.createVariable("year", "i4", ("year",))[:] = YEARS
    # CF attributes and coordinate variables, as in make_indexed.py, so cf-xarray can rebuild the grid
    for name, vals, attrs in (
        ("lat", LAT, {"units": "degrees_north", "standard_name": "latitude", "axis": "Y"}),
        ("lon", LON, {"units": "degrees_east", "standard_name": "longitude", "axis": "X"}),
        ("species", np.arange(96), {"long_name": "species index; names in species_code"}),
        ("fleet", np.arange(9), {"long_name": "fleet index; names in fleet_gear_code, fleet_country_code"}),
    ):
        v = o.createVariable(name, "f4" if name in ("lat", "lon") else "i4", (name,))
        v.setncatts(attrs)
        v[:] = vals
    for k in STR:
        v = o.createVariable(k, str, src[k].dimensions)
        v[:] = np.array(src[k][:], dtype=object)
    done = set()
    for name, (pdim, ix, vals) in maps.items():
        if pdim not in done:
            o.createDimension(pdim, len(ix))
            v = o.createVariable(pdim, "i4", (pdim,), zlib=True, complevel=4)
            v.compress = compress[pdim]
            v[:] = ix
            done.add(pdim)
        v = o.createVariable(name, "f4", ("year", pdim), zlib=True, complevel=4, shuffle=True, chunksizes=(NY, min(len(ix), pchunk or len(ix))), fill_value=np.float32(np.nan))
        v.units = "kg"
        v[:] = vals
    for name in SMALL:
        a = np.array(mm(name))
        dims = ("year",) + src[name].dimensions[1:]
        v = o.createVariable(name, "f4", dims, zlib=True, complevel=4, shuffle=True, fill_value=np.float32(np.nan))
        if hasattr(src[name], "units"):
            v.units = src[name].units
        v[:] = a
    o.close()
    return os.path.getsize(path)


def maps_bytes(path, names):
    import h5py

    with h5py.File(path, "r") as f:
        return sum(f[n].id.get_storage_size() for n in names)


def check(path, maps):
    d = netCDF4.Dataset(path)
    d.set_auto_mask(False)
    ok = True
    for name, (pdim, _, _) in maps.items():
        ix = d[pdim][:]
        shape = tuple(len(d.dimensions[k]) for k in d[pdim].compress.split())
        full = np.full((NY, int(np.prod(shape))), np.nan, "f4")
        full[:, ix] = d[name][:]
        ok &= np.array_equal(full.reshape((NY,) + shape), REF[name], equal_nan=True)
    d.close()
    return ok


results = {}
# ---------- Y1: yearly, fleets kept ----------
REF = {n: np.array(mm(n)) for n in ("gross_catch", "dead_discards", "live_discards", "biomass")}
ixc, _ = gather(np.stack([REF[n] for n in ("gross_catch", "dead_discards", "live_discards")]).reshape(3 * NY, -1))
y1 = {n: ("point_catch", ixc, REF[n].reshape(NY, -1)[:, ixc]) for n in ("gross_catch", "dead_discards", "live_discards")}
ixb, vb = gather(REF["biomass"])
y1["biomass"] = ("point_biomass", ixb, vb)
comp1 = {"point_catch": "species fleet lat lon", "point_biomass": "species lat lon"}
for label, pc in (("all points", None), ("4096 points", 4096)):
    p = os.path.join(OUT, f"Y1_{pc or 'all'}.nc")
    size = write(p, y1, comp1, pc)
    results[f"Y1 yearly, fleets kept, chunks {NY} years x {label}"] = (size, maps_bytes(p, y1), check(p, y1))
print("Y1 points: catch", len(ixc), "biomass", len(ixb))

# ---------- Y2: yearly dashboard maps, fleets summed ----------
g, dd, lv = (REF[n] for n in ("gross_catch", "dead_discards", "live_discards"))
land = np.where(np.isnan(g), np.nan, g - np.nan_to_num(dd) - np.nan_to_num(lv))
REF = {"biomass": REF["biomass"], "gross_catch": fleet_sum(g), "dead_discards": fleet_sum(dd), "live_discards": fleet_sum(lv), "landings": fleet_sum(land)}
del g, dd, lv, land
ixs, _ = gather(np.stack([REF[n] for n in REF]).reshape(len(REF) * NY, -1))
y2 = {n: ("point", ixs, REF[n].reshape(NY, -1)[:, ixs]) for n in REF}
for label, pc in (("all points", None), ("4096 points", 4096)):
    p = os.path.join(OUT, f"Y2_{pc or 'all'}.nc")
    size = write(p, y2, {"point": "species lat lon"}, pc)
    results[f"Y2 yearly dashboard maps, fleets summed, chunks {NY} years x {label}"] = (size, maps_bytes(p, y2), check(p, y2))
print("Y2 points (species x cell):", len(ixs))
print()
for k, (size, mb, ok) in results.items():
    print(f"{k:72} file {size / 1e6:6.2f} MB, maps {mb / 1e6:6.2f} MB, same as yearly aggregates: {ok}")

# ---------- browser payload: one species code, biomass, every year ----------
rows = [i for i, c in enumerate(codes) if c == SPECIES]
b = np.nansum(REF["biomass"][:, rows], 1)  # dashboard sums the life stages of a code
b[np.isnan(REF["biomass"][:, rows]).all(1)] = np.nan
cells = np.nonzero((~np.isnan(b)).any(0).ravel())[0]
dense = b.astype("<f4").tobytes()
vals = b.reshape(NY, -1)[:, cells].astype("<f4")
sparse_bin = cells.astype("<u2").tobytes() + vals.tobytes()
lat_i, lon_i = cells // 109, cells % 109
js = json.dumps(
    {"species": SPECIES, "metric": "biomass", "years": YEARS.tolist(), "lat": [round(float(LAT[i]), 4) for i in lat_i], "lon": [round(float(LON[i]), 4) for i in lon_i], "values": [[None if not np.isfinite(x) else float(f"{x:.4g}") for x in row] for row in vals]},
    separators=(",", ":"),
).encode()
print()
print(f"browser payload, {SPECIES} biomass, {NY} years, {len(cells)} cells with a value of {82 * 109}:")
for label, data in (("dense float32 grid [year][82][109]", dense), ("sparse binary: cell index (uint16) + float32 [year][cell]", sparse_bin), ("sparse JSON: lat, lon once + values [year][cell], 4 digits", js)):
    print(f"  {label:58} raw {len(data) / 1e3:7.1f} KB, gzip {len(gzip.compress(data, 6)) / 1e3:6.1f} KB")
