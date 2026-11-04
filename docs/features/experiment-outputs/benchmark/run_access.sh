#!/bin/sh
# One process per variant, each with a time limit. Usage: run_access.sh <label>
# PYTHON: interpreter with the packages listed in README.md (default: python).
cd "$(dirname "$0")"
LABEL=$1
PY=${PYTHON:-python}
rm -f "work/access_$LABEL.json"
for v in M1_original/index M1_original/h5py M2_nc_origchunks_z4/index M3_zarr_origchunks M4_nc_speciesyear_z4/index M5_zarr_speciesyear A2_nc_species_z4/index A3_zarr_species D1_nc_dash_species/index D1_nc_dash_species/h5py D2_zarr_dash_species D3_zarr_dash_sharded D4_nc_dash_yearmaps/index D5_zarr_dash_yearmaps; do
  timeout 900 "$PY" -u -W ignore access.py work "$LABEL" "$v" 2>&1 | grep -E "^$LABEL|skip|Traceback|Error:" | grep -v -E "InvalidStateError|ConnectionResetError|OSError: \[WinError 995\]"
  echo "done $v exit=$?"
done
echo "EXIT $LABEL"
