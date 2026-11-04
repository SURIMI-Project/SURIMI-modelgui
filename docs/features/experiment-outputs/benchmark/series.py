"""Size of the chart data (no maps) of one run, yearly, as a small table in several encodings.

Tables (long format, one row per non-empty combination):
  species: year, species_code, life_stage, biomass, gross_catch, landings, dead_discards,
           live_discards, sales_quantity, sales_value, price_realised
  fleet:   year, species_code, life_stage, fleet, gross_catch, landings, dead_discards, live_discards
  market:  year, species_code, life_stage, market, price, sales_quantity, sales_value
Usage: python series.py <work dir> <source.nc>
"""

import gzip
import io
import json
import os
import sys

import netCDF4
import numpy as np
import pyarrow as pa
import pyarrow.parquet as pq

WORK, SRC = sys.argv[1], sys.argv[2]
AGG = os.path.join(WORK, "annual_raw")
s = netCDF4.Dataset(SRC)
codes = [str(x) for x in s["species_code"][:]]
stages = [str(x) for x in s["species_life_stage"][:]]
fleets = [f"{a}|{b}" for a, b in zip(s["fleet_gear_code"][:], s["fleet_country_code"][:])]
markets = [str(x) for x in s["market_code"][:]]
YEARS = list(range(2013, 2030))


def mm(n):
    p = os.path.join(AGG, n + ".f32")
    return np.array(np.memmap(p, "f4", "r", shape=tuple(json.load(open(p + ".json")))))


def fin(x):
    x = x.astype("f8")
    x[~np.isfinite(x)] = np.nan
    return x


def nsum(x, axes):
    n = np.isfinite(x).sum(axes)
    r = np.asarray(np.nansum(x, axes), dtype="f8")
    r = np.where(n == 0, np.nan, r)
    return float(r) if r.ndim == 0 else r


bt = fin(mm("biomass_total"))
g, d, l = (fin(mm(n)) for n in ("gross_catch_total", "dead_discards_total", "live_discards_total"))
land = g - np.nan_to_num(d) - np.nan_to_num(l)
sq, sv = fin(mm("sales_quantity")), fin(mm("sales_value"))
pr = fin(mm("price"))[..., 0]
pr[pr > 1e3] = np.nan

tables = {}
rows = []
for y, yr in enumerate(YEARS):
    for i in range(96):
        rec = dict(year=yr, species_code=codes[i], life_stage=stages[i], biomass=bt[y, i], gross_catch=nsum(g[y, i], 0), landings=nsum(land[y, i], 0), dead_discards=nsum(d[y, i], 0), live_discards=nsum(l[y, i], 0), sales_quantity=nsum(sq[y, i], (0, 1)), sales_value=nsum(sv[y, i], (0, 1)))
        rec["price_realised"] = rec["sales_value"] / rec["sales_quantity"] if rec["sales_quantity"] else np.nan
        if any(np.isfinite(v) for k, v in rec.items() if k not in ("year", "species_code", "life_stage")):
            rows.append(rec)
tables["species"] = rows
rows = []
for y, yr in enumerate(YEARS):
    for i in range(96):
        for f in range(9):
            if np.isfinite(g[y, i, f]):
                rows.append(dict(year=yr, species_code=codes[i], life_stage=stages[i], fleet=fleets[f], gross_catch=g[y, i, f], landings=land[y, i, f], dead_discards=d[y, i, f], live_discards=l[y, i, f]))
tables["fleet"] = rows
rows = []
for y, yr in enumerate(YEARS):
    for i in range(96):
        for m in range(38):
            q = nsum(sq[y, i, :, m], 0)
            if np.isfinite(pr[y, i, m]) or np.isfinite(q):
                rows.append(dict(year=yr, species_code=codes[i], life_stage=stages[i], market=markets[m], price=pr[y, i, m], sales_quantity=q, sales_value=nsum(sv[y, i, :, m], 0)))
tables["market"] = rows


def to_json(rows):
    clean = [{k: (None if isinstance(v, float) and not np.isfinite(v) else (round(float(v), 4) if isinstance(v, (float, np.floating)) else v)) for k, v in r.items()} for r in rows]
    return json.dumps(clean, separators=(",", ":")).encode()


def to_parquet(rows):
    t = pa.Table.from_pylist([{k: (float(v) if isinstance(v, (float, np.floating)) else v) for k, v in r.items()} for r in rows])
    b = io.BytesIO()
    pq.write_table(t, b, compression="zstd", use_dictionary=True)
    return b.getvalue()


out = {}
for name, rows in tables.items():
    j = to_json(rows)
    out[name] = {"rows": len(rows), "json": len(j), "json_gzip": len(gzip.compress(j, 6)), "parquet_zstd": len(to_parquet(rows))}
    print(name, out[name])
hke = [r for r in tables["species"] if r["species_code"] == "HKE"]
j = to_json(hke)
out["one_species_species_table"] = {"rows": len(hke), "json": len(j), "json_gzip": len(gzip.compress(j, 6))}
print("HKE only", out["one_species_species_table"])
json.dump(out, open(os.path.join(WORK, "series_results.json"), "w"), indent=1)
