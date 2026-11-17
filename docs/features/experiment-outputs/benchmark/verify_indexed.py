"""Check that the indexed file rebuilds the source exactly: every map, every month, every other variable.

Usage: python verify_indexed.py <source.nc> <indexed.nc>
"""

import sys

import netCDF4
import numpy as np
import xarray as xr

SRC, IDX = sys.argv[1], sys.argv[2]
s = netCDF4.Dataset(SRC)
s.set_auto_mask(False)
x = netCDF4.Dataset(IDX)
x.set_auto_mask(False)
NT = len(s.dimensions["time"])
ok = True


def same(a, b):
    return a.shape == b.shape and np.array_equal(a, b, equal_nan=True)


def ungather(name, t0, t1):
    """Rebuild the full (time, species, [fleet,] lat, lon) block from the indexed file."""
    pdim = x[name].dimensions[1]
    ix = x[pdim][:]
    shape = tuple(len(x.dimensions[d]) for d in x[pdim].compress.split())
    vals = x[name][t0:t1]
    full = np.full((t1 - t0, int(np.prod(shape))), np.nan, "f4")
    full[:, ix] = vals
    return full.reshape((t1 - t0,) + shape)


for name in ("gross_catch", "dead_discards", "live_discards", "biomass"):
    good = True
    for t in range(0, NT, 12):
        t1 = min(NT, t + 12)
        a = s[name][t:t1]
        a = np.where(a >= 9e19, np.nan, a)  # source fill value -> missing; never set in practice
        good &= same(ungather(name, t, t1), a)
    print(f"{name:20} all {NT} months identical to the source: {good}")
    ok &= good

for name, var in s.variables.items():
    if name in ("gross_catch", "dead_discards", "live_discards", "biomass"):
        continue
    a, b = var[:], x[name][:]
    good = np.array_equal(a, b) if var.dtype == str or a.dtype == object else same(np.asarray(a), np.asarray(b))
    # lat and lon gain CF units the source lacks; every other variable must keep its units
    units_ok = name in ("lat", "lon") or getattr(var, "units", None) == getattr(x[name], "units", None)
    if not (good and units_ok):
        print(f"{name:20} DIFFERENT (values {good}, units {units_ok})")
    ok &= good and units_ok
print("other variables identical, with their units:", ok)

ds = xr.open_dataset(IDX)
print("xarray opens it:", dict(ds.sizes))
print("ALL CHECKS PASSED" if ok else "CHECKS FAILED")
