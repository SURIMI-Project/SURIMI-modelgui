# T01 — Add 2 new charts in Dashboard of Outputs

**Request:** Add the following existing `/test` charts in a new section immediately before **Market Indicators** on the Outputs dashboard:

- **Stock Size (B/BMSY)** — top right in the reference screenshot.
- **Exploitation (F/FMSY)** — bottom left in the reference screenshot.

Keep the Stock Size horizontal reference lines at **0.5** and **1.0** always visible. These are lines inside the chart, not additional charts. Catch vs MSY and Kobe Plot are outside this ticket.

### Tasks — not started

- [ ] Confirm which case-study dashboards should receive the section.
- [ ] Confirm which stock/run supplies the data and how species selection and run comparison should affect the charts.
- [ ] Reuse/adapt the existing Stock Size and Exploitation chart components.
- [ ] Place both charts in a new section before Market Indicators; agree its title.
- [ ] Preserve Stock Size reference lines at 0.5 and 1.0 across the displayed period.
- [ ] Connect the agreed data source; clearly identify any temporary mock data.
- [ ] Check both charts on desktop/mobile and verify the existing `/test` page still works.

### Existing components

Paths are relative to the repository root.

| Component                  | Location                                                                    |
| -------------------------- | --------------------------------------------------------------------------- |
| Stock Size                 | `src/pages/MsyModelPage/components/StockSizeChart/StockSizeChart.tsx`       |
| Exploitation               | `src/pages/MsyModelPage/components/ExploitationChart/ExploitationChart.tsx` |
| Shared chart card          | `src/pages/MsyModelPage/components/InsightChartCard/InsightChartCard.tsx`   |
| Page rendering both charts | `src/pages/MsyModelPage/MsyModelPage.tsx` — route `/test`                   |
| Current chart data         | `src/data/mockData.ts`                                                      |

Output insertion points are in `src/features/ScenarioOutputs/`:

- `AnchovyBay/AnchovyBayOutputs.tsx`
- `AegeanSea/AegeanSeaOutputs.tsx`
- `WesternMediterranean/WesternMediterraneanOutputs.tsx` (Northwestern Mediterranean)

Each currently renders `MapBiomassAndLandingsPanel` followed by `MarketIndicatorsPanel`.

### Data details to clarify before integration

The existing charts use `StockMockData` for one stock, with prototype rescaling, missing-value defaults, and synthetic shaded bands. The Outputs dataset does not yet contain dedicated CMSY++ ratio series. Confirm the real result source, time range, missing-value behaviour, and whether uncertainty bands should appear. Do not present the existing fixture as real results for other stocks or runs.

### Done when

- Both requested charts appear before Market Indicators on the agreed dashboards.
- Stock Size always shows its 0.5 and 1.0 reference lines.
- Charts use the agreed stock/run data and selection behaviour, with readable responsive layouts.
