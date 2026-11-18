# Local demonstration data

Output reports still use demonstration fixtures. Authentication, case availability,
the runs list and Northwestern simulation creation use REST services. Explicit
local development HCR presets are labeled and excluded from production form defaults.

| File/folder | Contains |
| --- | --- |
| `caseMap.ts` | Map presentation copy, case colours and illustrative camera/label locations; not scientific boundary data |
| `designSystem.ts` | Auth presentation copy and fixed design-system examples |
| `caseStudies.ts` | Case names, descriptions, video sources and REST scenario identifiers |
| `simulation.ts` | The one fixed example simulation shown in the library |
| `defaultConfigureRules.ts` | Development-only HCR thresholds in kg for real eligible Northwestern entries; not scientific defaults |
| `content/` | Case introductions, model-flow descriptions, legend descriptions and reference-page concepts |
| `content/climateScenarios.ts` | Static RCP/SSP explanatory copy and source links; availability always comes from backend experiment options |
| `species/` | Reference species rows/taxonomy and the prototype species mapper |
| `outputs/report.ts` | The single shared example report configuration |
| `outputs/createExampleDataset.ts` | Deterministically expands that configuration once into fixture grids/series; never uses form inputs or generates runs |
| `outputs/chartSeries.ts`, `outputs/indicators.ts` | Synthetic historical/market/indicator values for display; not scientific calculations validated by the model team |
| `cmsy.ts`, `*ChartSeries.ts` | `/test` sample data, prototype normalization, and synthetic uncertainty bands |

Ordinary UI labels, styling, routing and React component references remain in `src/`. This folder is not a translation system or the future REST response contract. Existing reference species content may be useful for later input design, but it is not evidence of live scenario support.

The isolated `experiments/netcdf-lab/` has its own fixtures and reader implementation and does not use this simulation/report flow. It remains portable independently.

Later REST integration should replace these explicit fixture imports with backend services and TanStack Query hooks; do not silently fall back to this report when a real request fails.
