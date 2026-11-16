"""Write the monthly .nc with the maps indexed by species x fleet x lat x lon (CF compression by gathering).

Only the (species, fleet, cell) combinations that hold a value in at least one month are
stored, so each map becomes time x point. Every other variable is copied unchanged.
CF conventions section 8.2: the list variable holds 0-based indices into the uncompressed
array, in C order of the dimensions named in its `compress` attribute.
Usage: python make_indexed.py <source.nc> <out.nc>
"""

import os
import sys
import time

import netCDF4
import numpy as np

SRC, OUT = sys.argv[1], sys.argv[2]
FILL = np.float32(1e20)
STEP = 12  # months read at a time
MAPS = {  # map -> (point dimension, dimensions it gathers)
    "gross_catch": ("point_catch", ("species", "fleet", "lat", "lon")),
    "dead_discards": ("point_catch", ("species", "fleet", "lat", "lon")),
    "live_discards": ("point_catch", ("species", "fleet", "lat", "lon")),
    "biomass": ("point_biomass", ("species", "lat", "lon")),
}

t_start = time.time()
src = netCDF4.Dataset(SRC)
src.set_auto_mask(False)
NT = len(src.dimensions["time"])


def present(a):
    return np.isfinite(a) & (a < 9e19) | np.isinf(a)


# 1. points used in at least one month; the three catch maps must share them
points = {}
for name, (pdim, _) in MAPS.items():
    used = None
    for t in range(0, NT, STEP):
        m = present(src[name][t : t + STEP]).any(0).ravel()
        used = m if used is None else used | m
    ix = np.nonzero(used)[0].astype("i4")
    if pdim in points and not np.array_equal(points[pdim], ix):
        raise SystemExit(f"{name} uses other points than the other {pdim} maps")
    points[pdim] = ix
    print(f"{name:14} {len(ix):,} points", flush=True)

# 2. write
if os.path.exists(OUT):
    os.remove(OUT)
out = netCDF4.Dataset(OUT, "w", format="NETCDF4")
out.setncatts(
    {
        "Conventions": "CF-1.8",
        "title": "SURIMI outputs, maps indexed by species x fleet x lat x lon",
        "source": os.path.basename(SRC),
        "layout": "Maps are stored as (time, point). point_catch and point_biomass are CF list "
        "variables: 0-based C-order indices into (species, fleet, lat, lon) and (species, lat, lon). "
        "Only combinations that hold a value in at least one month are stored; all others are "
        "missing in every month. All other variables are copied unchanged; added: coordinate "
        "variables species and fleet, and CF units on lat and lon.",
        "history": f"{time.strftime('%Y-%m-%d')} written by docs/features/experiment-outputs/benchmark/make_indexed.py",
    }
)
for name, dim in src.dimensions.items():
    out.createDimension(name, len(dim))
# Coordinate variables for the gathered dimensions (the source has none for species and
# fleet); CF tools such as cf-xarray need them to rebuild the full array.
for name, ref in (("species", "species_code"), ("fleet", "fleet_gear_code, fleet_country_code")):
    v = out.createVariable(name, "i4", (name,))
    v.long_name = f"{name} index; names in {ref}"
    v[:] = np.arange(len(src.dimensions[name]), dtype="i4")
# CF attributes the source lacks on lat and lon, so tools recognise the grid.
GEO = {
    "lat": {"units": "degrees_north", "standard_name": "latitude", "axis": "Y"},
    "lon": {"units": "degrees_east", "standard_name": "longitude", "axis": "X"},
}
for pdim, ix in points.items():
    out.createDimension(pdim, len(ix))
    v = out.createVariable(pdim, "i4", (pdim,), zlib=True, complevel=4)
    v.compress = " ".join(MAPS[next(k for k, (p, _) in MAPS.items() if p == pdim)][1])
    v.long_name = "index of the stored combination in the uncompressed array"
    v[:] = ix

for name, var in src.variables.items():
    attrs = {k: var.getncattr(k) for k in var.ncattrs() if k != "_FillValue"}
    if name in MAPS:
        pdim = MAPS[name][0]
        n = len(points[pdim])
        v = out.createVariable(name, "f4", ("time", pdim), zlib=True, complevel=4, shuffle=True, chunksizes=(STEP, n), fill_value=FILL)
        v.setncatts(attrs)
        for t in range(0, NT, STEP):
            a = src[name][t : t + STEP]
            v[t : t + a.shape[0]] = a.reshape(a.shape[0], -1)[:, points[pdim]]
        print(f"wrote {name}", flush=True)
        continue
    if var.dtype == str or var.dtype is str:
        v = out.createVariable(name, str, var.dimensions)
        v[:] = np.array(var[:], dtype=object)
    else:
        kw = {}
        if var.chunking() != "contiguous" and var.ndim > 0 and var.dtype == np.float32:
            kw = dict(zlib=True, complevel=4, shuffle=True, chunksizes=var.chunking(), fill_value=FILL)
        v = out.createVariable(name, var.dtype, var.dimensions, **kw)
        v[:] = var[:]
    v.setncatts({**attrs, **GEO.get(name, {})})
out.close()
print(f"{OUT}: {os.path.getsize(OUT) / 1e6:.1f} MB (source {os.path.getsize(SRC) / 1e6:.1f} MB), {time.time() - t_start:.0f} s")
