"""Correctness of the yearly dashboard product against the monthly source, and loss of the quantized variants."""

import sys

import netCDF4
import numpy as np
import zarr

SRC, V = sys.argv[1], sys.argv[2]
s = netCDF4.Dataset(SRC)
s.set_auto_mask(False)
d1 = netCDF4.Dataset(f"{V}/D1_nc_dash_species.nc")
d1.set_auto_mask(False)
codes = [str(x) for x in s["species_code"][:]]
rows = [i for i, c in enumerate(codes) if c == "HKE"]


def src(name, t0, t1, sl=slice(None)):
    a = s[name][t0:t1, sl].astype("f8")
    a[a >= 9e19] = np.nan
    return a


ok = True
for y in (0, 7, 16):
    t0, t1 = 12 * y, 12 * y + 12
    b = src("biomass", t0, t1, slice(min(rows), max(rows) + 1))
    with np.errstate(invalid="ignore"):
        n = np.isfinite(b).sum(0)
        mean = np.where(n > 0, np.nansum(b, 0) / np.maximum(n, 1), np.nan)
    got = d1["biomass"][y, min(rows) : max(rows) + 1].astype("f8")
    e1 = np.allclose(mean, got, rtol=1e-5, equal_nan=True)
    g = src("gross_catch", t0, t1, slice(min(rows), max(rows) + 1))
    dd = src("dead_discards", t0, t1, slice(min(rows), max(rows) + 1))
    lv = src("live_discards", t0, t1, slice(min(rows), max(rows) + 1))
    land = np.nansum(np.nansum(g - np.nan_to_num(dd) - np.nan_to_num(lv), 0), 1)
    got_l = np.nan_to_num(d1["landings"][y, min(rows) : max(rows) + 1].astype("f8"))
    e2 = np.allclose(land, got_l, rtol=1e-4, atol=1e-3)
    bt = src("biomass_total", t0, t1)
    e3 = np.allclose(np.nanmean(bt, 0), d1["biomass_total"][y].astype("f8"), rtol=1e-5, equal_nan=True)
    gt = src("gross_catch_total", t0, t1)
    e4 = np.allclose(np.nansum(gt, 0), np.nan_to_num(d1["gross_catch_total"][y].astype("f8")), rtol=1e-4)
    print("year", 2013 + y, "biomass map", e1, "landings map", e2, "biomass_total", e3, "gross_catch_total", e4)
    ok &= e1 and e2 and e3 and e4
print("yearly product matches monthly source:", ok)

z = zarr.open_consolidated(f"{V}/D2_zarr_dash_species.zarr", zarr_format=3)
q6 = netCDF4.Dataset(f"{V}/D6_nc_dash_quantized.nc")
q6.set_auto_mask(False)
q7 = zarr.open_consolidated(f"{V}/D7_zarr_dash_bitround.zarr", zarr_format=3)
for name in ("biomass", "landings", "gross_catch"):
    ref = d1[name][:].astype("f8")
    zz = z[name][:].astype("f8")
    print(name, "D2 zarr == D1 nc", np.array_equal(ref, zz, equal_nan=True))
    for label, arr in (("D6 nc BitRound 12 bits", q6[name][:]), ("D7 zarr BitRound 12 bits", q7[name][:])):
        a = arr.astype("f8")
        m = np.isfinite(ref) & (np.abs(ref) > 0)
        rel = np.abs(a[m] - ref[m]) / np.abs(ref[m])
        tot = abs(np.nansum(a) - np.nansum(ref)) / abs(np.nansum(ref))
        print(f"  {label}: max rel error per cell {rel.max():.2e}, median {np.median(rel):.2e}, error of the total {tot:.2e}")
