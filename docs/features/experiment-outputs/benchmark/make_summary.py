"""Write summary.json.gz in the proposed structure (format-benchmark-2026-11-03.md#proposed-structure).

Reads the yearly memmaps written by build.py (step 1), the source .nc for the axes
and the case-study species CSV for names and functional groups.
Usage: python make_summary.py <work dir> <source.nc> <species.csv> <out.json.gz>
"""

import csv
import gzip
import json
import os
import sys

import netCDF4
import numpy as np

WORK, SRC, CSV, OUT = sys.argv[1:5]
AGG = os.path.join(WORK, "annual_raw")
YEARS = list(range(2013, 2030))
PRICE_BOUND = 1000.0  # EUR/kg

s = netCDF4.Dataset(SRC)
codes = [str(x) for x in s["species_code"][:]]
stages = [str(x) for x in s["species_life_stage"][:]]
fleets = [f"{a}|{b}" for a, b in zip(s["fleet_gear_code"][:], s["fleet_country_code"][:])]
markets = [str(x) for x in s["market_code"][:]]
units = {v: getattr(s[v], "units", None) for v in ("biomass", "gross_catch", "price", "sales_value", "sales_quantity")}

with open(CSV, encoding="utf-8") as f:
    rows = list(csv.reader(f))
head = rows[0]
csv_info = {r[head.index("Stock")]: (r[head.index("Name")], r[head.index("SciName")], r[head.index("Group")]) for r in rows[1:] if len(r) > 5 and r[5]}


def mm(n):
    p = os.path.join(AGG, n + ".f32")
    return np.array(np.memmap(p, "f4", "r", shape=tuple(json.load(open(p + ".json")))), dtype="f8")


cleaned = {}


def clean(name, x, bound=None):
    bad = ~np.isfinite(x) & ~np.isnan(x)
    over = np.isfinite(x) & (x > bound) if bound is not None else np.zeros(x.shape, bool)
    cleaned[name] = {"non_finite": int(bad.sum()), "above_bound": int(over.sum())}
    x = x.copy()
    x[bad | over] = np.nan
    return x


def nsum(x, axes):
    n = np.isfinite(x).sum(axes)
    return np.where(n == 0, np.nan, np.nansum(x, axes))


bt = clean("biomass_total", mm("biomass_total"))
g = clean("gross_catch", mm("gross_catch_total"))
dd = clean("dead_discards", mm("dead_discards_total"))
lv = clean("live_discards", mm("live_discards_total"))
land = np.where(np.isnan(g), np.nan, g - np.nan_to_num(dd) - np.nan_to_num(lv))
sq = clean("sales_quantity", mm("sales_quantity"))
sv = clean("sales_value", mm("sales_value"))
pr = clean("price", mm("price")[..., 0], PRICE_BOUND)


def col(a):
    """Rounded list with null for missing; keeps the file small and JSON-valid."""
    return [None if not np.isfinite(v) else float(f"{v:.6g}") for v in np.ravel(a)]


# species rows that share one biomass series (functional-group duplicates)
groups = {}
for i in range(len(codes)):
    if np.isfinite(bt[:, i]).any():
        groups.setdefault(tuple(np.round(np.nan_to_num(bt[:, i], nan=-1), 2)), []).append(i)
shares = {i: [f"{codes[j]}{'/' + stages[j] if stages[j] else ''}" for j in g_ if j != i] for g_ in groups.values() if len(g_) > 1 for i in g_}

species = []
for i, (c, st) in enumerate(zip(codes, stages)):
    name, sci, grp = csv_info.get(c, (None, None, None))
    species.append({"index": i, "code": c, "life_stage": st or None, "name": name, "scientific_name": sci, "functional_group": grp, "on_dashboard": c in csv_info, "shares_series_with": shares.get(i, [])})

sales_q = nsum(sq, (2, 3))
sales_v = nsum(sv, (2, 3))
with np.errstate(invalid="ignore", divide="ignore"):
    price_realised = np.where(sales_q > 0, sales_v / sales_q, np.nan)

# series: [year][species] arrays, flattened year-major
series = {
    "biomass": col(bt),
    "gross_catch": col(nsum(g, 2)),
    "landings": col(nsum(land, 2)),
    "dead_discards": col(nsum(dd, 2)),
    "live_discards": col(nsum(lv, 2)),
    "sales_quantity": col(sales_q),
    "sales_value": col(sales_v),
    "price_realised": col(price_realised),
}

by_fleet = {"year": [], "species": [], "fleet": [], "gross_catch": [], "landings": [], "dead_discards": [], "live_discards": []}
for y in range(len(YEARS)):
    for i in range(len(codes)):
        for f in range(len(fleets)):
            if np.isfinite(g[y, i, f]):
                for k, v in (("year", YEARS[y]), ("species", i), ("fleet", f)):
                    by_fleet[k].append(v)
                for k, a in (("gross_catch", g), ("landings", land), ("dead_discards", dd), ("live_discards", lv)):
                    by_fleet[k] += col(a[y, i, f])

by_market = {"year": [], "species": [], "market": [], "price": [], "sales_quantity": [], "sales_value": []}
mq, mv = nsum(sq, 2), nsum(sv, 2)
for y in range(len(YEARS)):
    for i in range(len(codes)):
        for m in range(len(markets)):
            if np.isfinite(pr[y, i, m]) or np.isfinite(mq[y, i, m]):
                for k, v in (("year", YEARS[y]), ("species", i), ("market", m)):
                    by_market[k].append(v)
                by_market["price"] += col(pr[y, i, m])
                by_market["sales_quantity"] += col(mq[y, i, m])
                by_market["sales_value"] += col(mv[y, i, m])

doc = {
    "meta": {
        "product_version": 1,
        "experiment_id": os.path.basename(SRC).removesuffix(".nc"),
        "source": {"file": os.path.basename(SRC), "bytes": os.path.getsize(SRC)},
        "years": YEARS,
        "years_rule": "calendar years with all 12 months; the closing January of the run is left out",
        "aggregation": {"biomass": "mean of months", "price": "mean of months", "others": "sum of months"},
        "landings_rule": "gross_catch - dead_discards - live_discards",
        "units": units,
        "cleaning": {"rule": f"non-finite values and prices above {PRICE_BOUND:g} EUR/kg removed", "removed": cleaned},
        "layout": "series.<metric> is a flat list of len(years) x len(species), year-major; null = no data",
    },
    "fleets": fleets,
    "markets": markets,
    "species": species,
    "series": series,
    "by_fleet": by_fleet,
    "by_market": by_market,
}
raw = json.dumps(doc, separators=(",", ":")).encode()
with open(OUT, "wb") as f:
    f.write(gzip.compress(raw, 6))
print("summary", round(len(raw) / 1e3), "KB raw,", round(os.path.getsize(OUT) / 1e3), "KB gzipped;", len(species), "species rows,", len(by_fleet["year"]), "fleet rows,", len(by_market["year"]), "market rows; cleaned", cleaned)
