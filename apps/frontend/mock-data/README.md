# Local demonstration data

All case-study flows show **the same example simulation/report**. Completing an input form only navigates to the example; it never creates or saves a run or changes the report. Simulation setup/report demonstration creates no run, persistence or execution request. Authentication, password changes, SSO entry and case-study availability now use the real REST backend; these are separate from the scientific demo data.

| File/folder | Contains |
| --- | --- |
| `caseStudies.ts` | Case names, descriptions, video sources and REST scenario identifiers |
| `simulation.ts` | The one fixed example simulation shown in the library |
| `inputs.ts` | Prototype HCR values, duration/IPCC choices and explanations |
| `content/` | Case introductions, model-flow descriptions, legend descriptions and reference-page concepts |
| `species/` | Reference species rows/taxonomy and the prototype species mapper |
| `outputs/report.ts` | The single shared example report configuration |
| `outputs/createExampleDataset.ts` | Deterministically expands that configuration once into fixture grids/series; never uses form inputs or generates runs |
| `outputs/chartSeries.ts`, `outputs/indicators.ts` | Synthetic historical/market/indicator values for display; not scientific calculations validated by the model team |
| `cmsy.ts`, `*ChartSeries.ts` | `/test` sample data, prototype normalization, and synthetic uncertainty bands |

Ordinary UI labels, styling, routing and React component references remain in `src/`. This folder is not a translation system or the future REST response contract. Existing reference species content may be useful for later input design, but it is not evidence of live scenario support.

The isolated `experiments/netcdf-lab/` has its own fixtures and reader implementation and does not use this simulation/report flow. It remains portable independently.

Later REST integration should replace these explicit fixture imports with backend services and TanStack Query hooks; do not silently fall back to this report when a real request fails.
