# NetCDF JSON explorer

An isolated React + Vite explorer using **EarthyScience only** (`@earthyscience/netcdf4-wasm` 0.3.0). It has no dependency on SURIMI services, authentication, hooks, or styles.

## Use inside SURIMI

Open `http://localhost:5173/netcdf-lab`.

1. Use the prefilled MinIO URL and select **Fetch & open**, or choose a local `.nc` file and select **Open file**.
2. Inspect **File overview** for dimensions, global attributes, and all variable definitions.
3. Select a variable tab to read decoded source values as JSON. All variables are discovered from the file, not from a fixed list.
4. Change dimension **Start index** and **Count**, then choose **Read selection** to inspect another slice.
5. Download the displayed JSON using **Download JSON**.

**Species · joined** and **Fleets · joined** combine lookup arrays by matching index. **Markets · indexed** adds indices to market codes. These are explicitly constructed views, not extra variables present in the NetCDF file. Source arrays retain their own individual tabs.

For example, a species entry uses both `species_code` and `species_life_stage`; a repeated code must not be treated as a unique species-axis entry.

## JSON structure

Each variable result includes:

- `variable`, `dataType`, and original `attributes` (including units/fill markers).
- `dimensionOrder` and `fullShape`: the original array structure.
- `selection`: start and count for every dimension.
- `sliceShape`, `returnedValues`, `totalValues`, and `completeVariable`.
- `coordinates`: matching indices and available species/fleet/market/time/lat/lon lookups for the selected positions.
- `data`: nested arrays in the original dimension order, retaining singleton axes.

No aggregation, biomass-to-tonnes conversion, or scale/offset transformation is applied. JSON cannot encode non-finite numbers, so `NaN`, `Infinity`, and `-Infinity` become strings. Big integers become decimal strings to preserve precision. Original fill-marker numbers remain numbers. These encoding rules are shown in the UI and result JSON.

Small variables (up to **10,000 values**) are read in full by default. Larger variables initially select one item per dimension, with up to 5 latitude and 5 longitude positions. The page explicitly labels slices and their indices; it never presents a slice as a complete large variable. Select at most 10,000 values per read to keep decoding and JSON rendering bounded. If the package cannot slice a small variable (for example a classic NC_CHAR array), the explorer reads that variable in full only when it is within the same limit and extracts the requested selection; `readMethod` identifies that path.

## Download and memory

- The complete remote file is downloaded directly into the browser before opening. Progress chunks are not selective network reads.
- Downloads omit browser login credentials; presigned URLs may carry their own query parameters. The storage server must allow CORS.
- One reader worker holds the file. Variable tabs reuse that reader without downloading again.
- The full compressed file and the WASM filesystem can use substantially more memory than the download size. **Release file**, cancellation, reopening, or leaving the page terminates the worker.
- Download, opening, and latest variable-read times are shown separately.
- The default URL is in `config.ts`. Files are not uploaded or copied into the repository.
- The included tiny classic example is synthetic and can be used without the remote endpoint.

## Move or run this folder independently

Copy this folder elsewhere. With Node.js 22.12+ (or a compatible newer release):

```bash
npm install
npm run dev
```

Open the printed URL (default port 5174). The standalone page runs at `/`; no router or chart library is required. Run `npm run build` for production output.

To embed in another React + Vite app, install the dependencies from this folder's `package.json`, mount `NetcdfLabPage`, and register `await netcdfLabPlugin()` in Vite. The host chooses the page route. Runtime assets live beneath Vite's configured base URL at `netcdf-lab/`. The optional `backHref` prop controls the Back link.

`vite-plugin.ts` resolves the installed EarthyScience package and serves/emits its unmodified JS/WASM assets and license together with this folder's worker and fixture. No CDN or custom esbuild bundling is used.

## Remove from SURIMI

1. Remove the lab route, lazy import, and unused lazy/Suspense import from `src/App.tsx`.
2. Remove the lab plugin import and registration from root `vite.config.ts`.
3. Delete `experiments/netcdf-lab/` and restart Vite.
4. Uninstall `@earthyscience/netcdf4-wasm` if no other feature uses it.

The other reader packages and their custom bundling dependency have been removed. React and the host's existing chart packages are shared application dependencies and remain.

## Files

- `NetcdfLabPage.tsx` and CSS: source controls, variable tabs, range selection, JSON display/export.
- `types.ts`: view contracts and default slice selection.
- `descriptions.ts`: short explanations for known SURIMI variables; unknown variables still appear.
- `assets/reader-worker.js`: download, EarthyScience decoding, slicing, JSON encoding.
- `assets/classic-example.nc`: tiny synthetic test fixture.
- `config.ts`: default remote URL.
- `vite-plugin.ts`: runtime asset handling.
- `main.tsx`, `index.html`, `vite.config.ts`, `package.json`: standalone runner.
