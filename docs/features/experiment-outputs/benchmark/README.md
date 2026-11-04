# Output format benchmark: scripts

Scripts behind [../format-benchmark-2026-11-03.md](../format-benchmark-2026-11-03.md).
They are evidence for that report, not application code: they are not linted,
tested or imported by the backend.

| Script | What it does |
| --- | --- |
| `build.py` | Aggregates the monthly `.nc` to calendar years into raw float32 memmaps, then writes every storage variant (M2–M5, A1–A3, D1–D7) and records size, object count and build time in `work/build_results.json` |
| `make_summary.py` | Writes `summary.json.gz` in the proposed structure (meta, species, columnar yearly series, per-fleet and per-market tables) from `build.py`'s yearly memmaps and the case-study species CSV |
| `series.py` | Builds the chart tables (per species, per fleet, per market, yearly) and measures them as JSON, gzipped JSON and Parquet |
| `verify.py` | Checks the yearly product against the monthly source for three years, and measures the loss of the 12-bit variants |
| `access.py` | Uploads a variant to S3 and reads exactly what each dashboard action needs, counting every S3 request and byte |
| `run_access.sh` | Runs `access.py` for all variants, one process each |
| `compare_checks.py` | Confirms that every variant returned the same yearly map |

## Run

Python 3.13 with `numpy netCDF4 h5py xarray zarr==3.* numcodecs s3fs pyarrow psutil`.
Run from the repository root; paths are relative to it.

```sh
cd docs/features/experiment-outputs/benchmark
SRC=../../../../output_folder/experiments/99c1e2a4-5d3f-4e8a-9c6b-1f2a3d4e5f60/99c1e2a4-5d3f-4e8a-9c6b-1f2a3d4e5f60.nc
python build.py "$SRC" work                 # about 15 min, 2.5 GB RAM, 1.5 GB disk
python series.py work "$SRC"
python verify.py "$SRC" work/variants

# the proposed product, saved next to the run
OUT=../../../../output_folder/experiments/99c1e2a4-5d3f-4e8a-9c6b-1f2a3d4e5f60/derived
mkdir -p "$OUT" && cp work/variants/D1_nc_dash_species.nc "$OUT/maps.nc"
python make_summary.py work "$SRC" ../../../../apps/frontend/src/data/assets/west_med_fishes.csv "$OUT/summary.json.gz"

# S3: a throwaway MinIO; optional network delay with netem
docker run -d --name surimi-bench-minio -p 9100:9000 \
  -e MINIO_ROOT_USER=bench -e MINIO_ROOT_PASSWORD=benchbench minio/minio server /data
python -c "import s3fs; s3fs.S3FileSystem(key='bench', secret='benchbench', client_kwargs={'endpoint_url': 'http://127.0.0.1:9100'}).mkdir('bench')"
BENCH_SRC="$SRC" sh run_access.sh lat0
docker run --rm --net container:surimi-bench-minio --cap-add NET_ADMIN alpine \
  sh -c "apk add -q iproute2 && tc qdisc add dev eth0 root netem delay 20ms"
BENCH_SRC="$SRC" sh run_access.sh lat20
python compare_checks.py work
docker rm -f surimi-bench-minio
```

`work/` holds about 1.5 GB of variants; delete it afterwards. The MinIO
credentials above are for the throwaway container only.
