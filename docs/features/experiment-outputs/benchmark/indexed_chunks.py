"""Chunk layouts for the indexed monthly file: size, and what reading one species costs.

Points are sorted species-major, so a species is one contiguous range of points; chunks cut
along `point` let a reader fetch only that range. For each layout the script writes the four
maps, then counts the exact chunks and stored bytes one species needs (from the HDF5 chunk
index) and checks the values against the source.
Usage: python indexed_chunks.py <source.nc> <work dir> [species code, default HKE]
"""

import os
import sys
import time

import h5py
import netCDF4
import numpy as np

SRC, WORK = sys.argv[1], sys.argv[2]
SPECIES = sys.argv[3] if len(sys.argv) > 3 else "HKE"
os.makedirs(WORK, exist_ok=True)
MAPS = {"gross_catch": "point_catch", "dead_discards": "point_catch", "live_discards": "point_catch", "biomass": "point_biomass"}
LAYOUTS = [  # (label, time chunk, point chunk or None = all points)
    ("12 months x all points", 12, None),
    ("12 months x 4096 points", 12, 4096),
    ("12 months x 1024 points", 12, 1024),
    ("12 months x 256 points", 12, 256),
    ("all months x 1024 points", 205, 1024),
]

src = netCDF4.Dataset(SRC)
src.set_auto_mask(False)
NT = len(src.dimensions["time"])
codes = [str(c) for c in src["species_code"][:]]
rows = [i for i, c in enumerate(codes) if c == SPECIES]


def present(a):
    return (np.isfinite(a) & (a < 9e19)) | np.isinf(a)


points = {}
for name, pdim in MAPS.items():
    if pdim in points:
        continue
    used = None
    for t in range(0, NT, 12):
        m = present(src[name][t : t + 12]).any(0).ravel()
        used = m if used is None else used | m
    points[pdim] = np.nonzero(used)[0]

per_species = {"point_catch": 9 * 8938, "point_biomass": 8938}  # flat size of one species row
rng = {}
for pdim, ix in points.items():
    sp = ix // per_species[pdim]
    sel = np.nonzero(np.isin(sp, rows))[0]
    rng[pdim] = (int(sel.min()), int(sel.max()) + 1)
    print(f"{SPECIES} in {pdim}: points {rng[pdim][0]}..{rng[pdim][1]} ({sel.size} points, contiguous: {sel.size == rng[pdim][1] - rng[pdim][0]})")

# the source values of the species, for the value check
ref = {}
for name, pdim in MAPS.items():
    lo, hi = rng[pdim]
    want = points[pdim][lo:hi]
    out = np.empty((NT, hi - lo), "f4")
    for t in range(0, NT, 12):
        a = src[name][t : t + 12]
        out[t : t + a.shape[0]] = a.reshape(a.shape[0], -1)[:, want]
    ref[name] = out

YEAR = 2020 - 2013
reads = {"1 month": (12 * YEAR, 12 * YEAR + 1), "1 year (12 months)": (12 * YEAR, 12 * YEAR + 12), "all 205 months": (0, NT)}
print()
print(f"{'layout':28} {'4 maps':>8} | " + " | ".join(f"{k}: chunks, MB" for k in reads) + " | values")
for label, tc, pc in LAYOUTS:
    path = os.path.join(WORK, "chunks_test.nc")
    if os.path.exists(path):
        os.remove(path)
    o = netCDF4.Dataset(path, "w")
    o.createDimension("time", NT)
    for pdim, ix in points.items():
        o.createDimension(pdim, len(ix))
    for name, pdim in MAPS.items():
        n = len(points[pdim])
        v = o.createVariable(name, "f4", ("time", pdim), zlib=True, complevel=4, shuffle=True, chunksizes=(tc, min(n, pc or n)), fill_value=np.float32(1e20))
        for t in range(0, NT, 12):
            a = src[name][t : t + 12]
            v[t : t + a.shape[0]] = a.reshape(a.shape[0], -1)[:, points[pdim]]
    o.close()
    size = os.path.getsize(path)
    cells = []
    with h5py.File(path, "r") as f:
        for rname, (t0, t1) in reads.items():
            n = b = 0
            for name, pdim in MAPS.items():
                if name not in ("biomass", "gross_catch"):
                    continue  # one dashboard view: biomass and catch of one species
                d = f[name]
                ct, cp = d.chunks
                lo, hi = rng[pdim]
                for tk in range(t0 // ct, (t1 - 1) // ct + 1):
                    for pk in range(lo // cp, (hi - 1) // cp + 1):
                        info = d.id.get_chunk_info_by_coord((tk * ct, pk * cp))
                        n += 1
                        b += info.size
            cells.append(f"{n:5} {b / 1e6:7.3f}")
        tt = time.perf_counter()
        good = all(np.array_equal(f[name][:, rng[pdim][0] : rng[pdim][1]], ref[name], equal_nan=True) for name, pdim in MAPS.items())
        dt = time.perf_counter() - tt
    print(f"{label:28} {size / 1e6:6.1f}MB | " + " | ".join(f"{c:>22}" for c in cells) + f" | same as source: {good} (all months, 4 maps, {dt:.2f}s local)")
    os.remove(path)
