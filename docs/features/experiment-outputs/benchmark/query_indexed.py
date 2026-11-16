"""How to query the indexed file, each query checked against the original full-grid file.

The index is decoded once into small integer columns (species, fleet, lat, lon per point);
every query is then a boolean selection on those columns plus a read of the needed columns.
Usage: python query_indexed.py <original.nc> <indexed.nc>
"""

import sys
import time

import netCDF4
import numpy as np

ORIG, IDX = sys.argv[1], sys.argv[2]
o = netCDF4.Dataset(ORIG)
o.set_auto_mask(False)
f = netCDF4.Dataset(IDX)
f.set_auto_mask(False)

# ---- decode the index once (the backend keeps these arrays in memory: 0.4 MB) ----
codes = [str(c) for c in f["species_code"][:]]
stages = [str(s) for s in f["species_life_stage"][:]]
fleets = [f"{g}|{c}" for g, c in zip(f["fleet_gear_code"][:], f["fleet_country_code"][:])]
LAT, LON = f["lat"][:], f["lon"][:]
months = netCDF4.num2date(f["time"][:], f["time"].units, only_use_cftime_datetimes=False)
c_sp, c_fl, c_la, c_lo = np.unravel_index(f["point_catch"][:], (96, 9, 82, 109))
b_sp, b_la, b_lo = np.unravel_index(f["point_biomass"][:], (96, 82, 109))


def missing_to_nan(a):
    a = np.asarray(a, dtype="f8")
    a[a >= 9e19] = np.nan
    return a


def month(y, m):
    return next(i for i, d in enumerate(months) if d.year == y and d.month == m)


def row(code, stage=""):
    return next(i for i, (c, s) in enumerate(zip(codes, stages)) if c == code and s == stage)


def check(label, got, want):
    ok = np.allclose(got, want, rtol=1e-5, equal_nan=True)
    print(f"{label:62} {'same as original' if ok else 'DIFFERENT'}")
    return ok


ok = True
t = month(2020, 6)

# Q1: biomass map of one species row in one month -> 82 x 109 grid
t0 = time.perf_counter()
r = row("HKE", "juvenile")
sel = np.nonzero(b_sp == r)[0]
grid = np.full((82, 109), np.nan)
grid[b_la[sel], b_lo[sel]] = missing_to_nan(f["biomass"][t, sel.min() : sel.max() + 1])[sel - sel.min()]
ok &= check("Q1 biomass map, HKE/juvenile, 2020-06", grid, missing_to_nan(o["biomass"][t, r]))

# Q2: catch of one species code per fleet, every month (time series per fleet)
rows = [i for i, c in enumerate(codes) if c == "HKE"]
sel = np.nonzero(np.isin(c_sp, rows))[0]
vals = missing_to_nan(f["gross_catch"][:, sel.min() : sel.max() + 1])[:, sel - sel.min()]
series = np.zeros((len(months), 9))
for k in range(9):
    series[:, k] = np.nansum(vals[:, c_fl[sel] == k], axis=1)
want = np.nansum(missing_to_nan(o["gross_catch_total"][:, rows, :]), axis=1)
ok &= check("Q2 HKE catch per fleet, 205 months (vs gross_catch_total)", series, want)

# Q3: everything caught in one grid cell in one month (all species and fleets)
i, j = int(np.abs(LAT - 41.3).argmin()), int(np.abs(LON - 2.4).argmin())
sel = np.nonzero((c_la == i) & (c_lo == j))[0]
cell = np.full((96, 9), np.nan)
cell[c_sp[sel], c_fl[sel]] = missing_to_nan(f["gross_catch"][t, :])[sel]
ok &= check(f"Q3 catch at cell lat {LAT[i]:.2f} lon {LON[j]:.2f}, 2020-06, all species x fleets", cell, missing_to_nan(o["gross_catch"][t, :, :, i, j]))
caught = [(codes[s] + ("/" + stages[s] if stages[s] else ""), fleets[k], round(float(cell[s, k]), 1)) for s, k in zip(*np.nonzero(np.nan_to_num(cell) > 0))]
print("   largest there:", sorted(caught, key=lambda x: -x[2])[:3])

# Q4: biomass per species inside a box (lat 40-42, lon 2-4), one month
box = (LAT[b_la] >= 40) & (LAT[b_la] <= 42) & (LON[b_lo] >= 2) & (LON[b_lo] <= 4)
v = missing_to_nan(f["biomass"][t, :])
per_species = np.array([np.nansum(v[box & (b_sp == s)]) for s in range(96)])
la_m = (LAT >= 40) & (LAT <= 42)
lo_m = (LON >= 2) & (LON <= 4)
want = np.nansum(missing_to_nan(o["biomass"][t])[:, la_m][:, :, lo_m], axis=(1, 2))
ok &= check("Q4 biomass per species in box lat 40-42, lon 2-4, 2020-06", per_species, want)

# Q5: yearly mean biomass map of one species (12 months, then the same scatter as Q1)
r = row("HKE", "juvenile")
sel = np.nonzero(b_sp == r)[0]
y0 = month(2020, 1)
block = missing_to_nan(f["biomass"][y0 : y0 + 12, sel.min() : sel.max() + 1])[:, sel - sel.min()]
grid = np.full((82, 109), np.nan)
grid[b_la[sel], b_lo[sel]] = np.nanmean(block, axis=0)
ok &= check("Q5 yearly mean biomass map, HKE/juvenile, 2020", grid, np.nanmean(missing_to_nan(o["biomass"][y0 : y0 + 12, r]), axis=0))

# Q6: the same data as a table, for filtering like SQL (pandas)
import pandas as pd  # noqa: E402

df = pd.DataFrame({"species": np.array(codes)[c_sp], "life_stage": np.array(stages)[c_sp], "fleet": np.array(fleets)[c_fl], "lat": LAT[c_la], "lon": LON[c_lo], "gross_catch": missing_to_nan(f["gross_catch"][t, :])})
top = df[df.fleet == "OTB|ESP"].groupby("species").gross_catch.sum().nlargest(3)
want = {c: float(np.nansum(missing_to_nan(o["gross_catch"][t, [k for k, cc in enumerate(codes) if cc == c], fleets.index("OTB|ESP")]))) for c in top.index}
ok &= check("Q6 table query: top 3 species of OTB|ESP, 2020-06", top.values, np.array(list(want.values())))
print("   ", dict(top.round(1)))
print("ALL QUERIES MATCH THE ORIGINAL" if ok else "SOME QUERIES DIFFER")
