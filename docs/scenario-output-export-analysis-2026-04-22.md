# Scenario Output Export Analysis

Analyzed on `2026-04-22` from:

- `/Users/spyroskalimeris/Downloads/export/*.jsonl`
- `/Users/spyroskalimeris/Downloads/Example NetCDF FIle with data.eml`

## Backend-Relevant Findings

These are the main findings that are likely useful for the future backend contract.

- The export is **monthly** and currently contains `49` time slices, from `2013-01-01` to `2017-01-01`.
- The raw output is **axis-based**, not entity-based. Several files rely on positional lookup arrays that must stay aligned by index.
- `species_code` and `species_life_stage` together define the species axis. `species_code` alone is not a stable unique key.
- Catch and discard outputs include a **fleet segment** axis, where fleet metadata is reconstructed from aligned `fleet_country_code` and `fleet_gear_code` arrays.
- `price` includes both **market** and **gear** axes.
- `sales_quantity` and `sales_value` include both **fleet** and **market** axes.
- `biomass` has no fleet axis, which means not all metrics share the same dimensionality.
- The JSONL export does not currently expose explicit `lat` / `lon` coordinate arrays, even though the data is spatial-temporal. That is a likely backend/API gap for frontend map rendering.
- Several files use `.jsonl` but are really “one JSON object per time slice”, not classic newline-delimited small records. If this format is kept, consumers will need streaming or chunked parsing.
- `NaN` is heavily used in the raster-like arrays, so any backend normalization step should define how missing values are serialized for API clients.
- The current frontend should not consume these raw files directly. A backend adapter layer should likely normalize:
  - monthly to yearly or period-based aggregates when needed
  - species + life stage to the UI selection model
  - fleet and market dimensions to dashboard-ready series
  - raster cells plus coordinates to map-ready payloads
- The email also confirms that writing full NetCDF output is memory-heavy during simulation, so backend design should expect pressure around export generation and possibly prefer staged aggregation or derived API payloads.

## Summary

These files are useful as a **future raw data contract**, but not as a drop-in replacement for the current dashboard data shape.

What they give us now:

- Real metric families coming out of SURIMI
- Real axis structure for species, fleet segments, markets, and price gear codes
- Monthly time slices from `2013-01-01` to `2017-01-01` inclusive
- Clear distinction between map-like raster outputs and graph-like aggregated outputs

What they do **not** give us yet:

- Lat/lon coordinate arrays in the JSONL export
- Fishing activity output
- Stable final schema guarantees
- Trustworthy final values

## Important Findings

### 1. The files are not all the same format

Despite the `.jsonl` extension, there are two actual patterns:

- Time-sliced JSON objects, one per line:
  - `biomass.jsonl`
  - `gross_catch.jsonl`
  - `live_discards.jsonl`
  - `dead_discards.jsonl`
  - `gross_catch_total.jsonl`
  - `live_discards_total.jsonl`
  - `dead_discards_total.jsonl`
  - `price.jsonl`
  - `sales_quantity.jsonl`
  - `sales_value.jsonl`
- Small JSON lookup payloads with a single `data` array:
  - `species_code.jsonl`
  - `species_life_stage.jsonl`
  - `fleet_country_code.jsonl`
  - `fleet_gear_code.jsonl`
  - `market_code.jsonl`
  - `price_gear_code.jsonl`

The `.eml` file is only the email body plus a SharePoint link. It is not the NetCDF file itself.

### 2. Time cadence

The time-sliced files all have `49` records:

- first record: `2013-01-01T00:00:00.000000000`
- second record: `2013-02-01T00:00:00.000000000`

So this is monthly data across roughly 4 years, including both endpoints.

### 3. Axis structure

The lookup files line up with the metric dimensions:

- `species_code.jsonl`: `94` entries
- `species_life_stage.jsonl`: `94` entries
- `fleet_country_code.jsonl`: `9` entries
- `fleet_gear_code.jsonl`: `9` entries
- `market_code.jsonl`: `38` entries
- `price_gear_code.jsonl`: `7` entries

This strongly suggests these are positional lookup axes, not separate unrelated tables.

## Dataset Shapes

### Spatial-temporal outputs

All records follow:

```ts
type TimedExportSlice<T> = {
  index: number;
  time: string;
  data: T;
};
```

#### `biomass.jsonl`

- shape per record: `[94, 82, 109]`
- interpretation: `[species_life_stage, lat, lon]`
- note: no fleet dimension

#### `gross_catch.jsonl`

- shape per record: `[94, 9, 82, 109]`
- interpretation: `[species_life_stage, fleet_segment, lat, lon]`

#### `live_discards.jsonl`

- shape per record: `[94, 9, 82, 109]`
- interpretation: `[species_life_stage, fleet_segment, lat, lon]`
- note: the sampled values are all zero right now

#### `dead_discards.jsonl`

- shape per record: `[94, 9, 82, 109]`
- interpretation: `[species_life_stage, fleet_segment, lat, lon]`

### Temporal aggregated outputs

#### `gross_catch_total.jsonl`

- shape per record: `[94, 9]`
- interpretation: `[species_life_stage, fleet_segment]`
- appears to be aggregated from `gross_catch`

#### `live_discards_total.jsonl`

- shape per record: `[94, 9]`
- interpretation: `[species_life_stage, fleet_segment]`
- sampled values are all zero right now

#### `dead_discards_total.jsonl`

- shape per record: `[94, 9]`
- interpretation: `[species_life_stage, fleet_segment]`

#### `price.jsonl`

- shape per record: `[94, 38, 7]`
- interpretation: `[species_life_stage, market, gear]`

#### `sales_quantity.jsonl`

- shape per record: `[94, 9, 38]`
- interpretation: `[species_life_stage, fleet_segment, market]`

#### `sales_value.jsonl`

- shape per record: `[94, 9, 38]`
- interpretation: `[species_life_stage, fleet_segment, market]`

## Lookup Dimensions

### Species axis

`species_code.jsonl` and `species_life_stage.jsonl` are aligned by index.

Examples:

- `ANE` appears multiple times
- `HKE` appears multiple times
- `PIL` appears multiple times

That means the real primary key is closer to:

```ts
type SpeciesAxisEntry = {
  speciesCode: string;
  lifeStage: "" | "adult" | "juvenile";
};
```

So the current dashboard assumption of "one code = one species series" is too simple for the real export.

### Fleet axis

`fleet_country_code.jsonl` and `fleet_gear_code.jsonl` are aligned by index and define `9` fleet segments.

Suggested normalized form:

```ts
type FleetAxisEntry = {
  countryCode: string;
  gearCode: string;
};
```

### Market axis

`market_code.jsonl` provides `38` market codes.

### Price gear axis

`price_gear_code.jsonl` provides `7` gear slots, including an empty string entry.

## Why This Matters For The Dashboard

The current dashboard mock data shape is conceptually:

- selected species
- selected year
- map points
- annual biomass / catches / discards
- simplified sales / prices

The real export shape is conceptually:

- monthly slices
- raster grids, not point clouds
- species + life stage
- fleet segment dimension on catches/discards/sales
- market dimension on prices/sales

So we will definitely need an adapter layer between SURIMI exports and the UI.

## Recommended Adapter Direction

Target a normalized intermediate contract like:

```ts
type ScenarioDatasetRaw = {
  times: string[];
  speciesAxis: Array<{ speciesCode: string; lifeStage: string }>;
  fleetAxis: Array<{ countryCode: string; gearCode: string }>;
  marketAxis: string[];
  priceGearAxis: string[];
  metrics: {
    biomass: number[][][]; // time -> species -> lat -> lon, or equivalent sliced storage
    grossCatch: number[][][][]; // time -> species -> fleet -> lat -> lon
    liveDiscards: number[][][][];
    deadDiscards: number[][][][];
    grossCatchTotal: number[][][]; // time -> species -> fleet
    liveDiscardsTotal: number[][][];
    deadDiscardsTotal: number[][][];
    price: number[][][]; // time -> species -> market -> gear
    salesQuantity: number[][][]; // time -> species -> fleet -> market
    salesValue: number[][][]; // time -> species -> fleet -> market
  };
};
```

Then build dashboard-specific selectors on top of that:

- aggregate monthly -> yearly if needed
- combine life stages when the UI wants one species
- combine fleet segments when the UI wants one total
- combine markets for sales/price views
- transform raster cells into map render input

## Immediate Reuse Value

Useful right now:

- file naming and metric taxonomy
- exact dimensionality
- lookup-table structure
- the fact that catches/discards are fleet-aware while biomass is not
- the fact that prices are market+gear aware
- the fact that sales are fleet+market aware

Not directly reusable yet:

- exact frontend map rendering input
- exact final chart series shape
- any stable business meaning of zeros / `NaN`

## Open Questions To Clarify With The Data Team

1. Where are the `lat` and `lon` coordinate arrays in the exported JSONL version?
2. Are `species_code` + `species_life_stage` guaranteed to stay aligned by index?
3. Should the frontend usually aggregate across life stages or expose them explicitly?
4. Are the `9` fleet entries guaranteed to be the cartesian combination of country + gear, or just indexed segments?
5. Is `price` really indexed by market and gear, and is the blank gear slot intentional?
6. Should totals remain pre-aggregated in the export, or should the frontend derive them from the spatial layers?
7. Will fishing activity be time-only, fleet-only, or spatial-temporal?
8. Can the team provide one small NetCDF plus a JSON schema export for the same run?

## Practical Conclusion

Yes, these files are useful.

Not because we should directly feed them into the dashboard today, but because they define the real raw-data shape we should design around next:

- monthly slices
- lookup-driven axes
- raster maps
- aggregation adapter between export and UI

The biggest current blocker for map integration from these JSONL files is the missing explicit lat/lon coordinate arrays.
