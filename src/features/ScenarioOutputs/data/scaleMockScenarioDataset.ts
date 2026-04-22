import type { ScenarioOutputsDataset } from "../types";

const hashString = (value: string) => {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash;
};

export const scaleMockScenarioDataset = (
  baseDataset: ScenarioOutputsDataset,
  runId: string,
  title: string,
): ScenarioOutputsDataset => {
  const seed = hashString(runId);
  const biomassFactor = 0.9 + (seed % 21) / 100;
  const catchFactor = 0.88 + ((seed >> 3) % 25) / 100;
  const discardFactor = 0.92 + ((seed >> 7) % 17) / 100;
  const priceFactor = 0.9 + ((seed >> 11) % 19) / 100;
  const salesFactor = 0.9 + ((seed >> 15) % 23) / 100;

  return {
    ...baseDataset,
    runId,
    simulationMetadata: {
      ...baseDataset.simulationMetadata,
      run_id: runId.toUpperCase(),
      created_at: new Date(2026, 3, 1 + (seed % 20)).toISOString(),
    },
    title,
    species_outputs: baseDataset.species_outputs.map(
      (speciesOutput, speciesIndex) => ({
        ...speciesOutput,
        annual_grids: speciesOutput.annual_grids.map((yearGrid, yearIndex) => {
          const seasonalPulse =
            Math.sin(
              (yearIndex + 1) * 0.27 + speciesIndex * 0.31 + (seed % 13),
            ) * 0.04;

          return {
            ...yearGrid,
            cells: yearGrid.cells.map((cell) => ({
              ...cell,
              biomass: Number(
                (cell.biomass * (biomassFactor + seasonalPulse)).toFixed(3),
              ),
              catches: Number(
                (cell.catches * (catchFactor + seasonalPulse)).toFixed(2),
              ),
              discards: Number(
                (cell.discards * (discardFactor + seasonalPulse * 0.5)).toFixed(
                  2,
                ),
              ),
              landings: Number(
                (
                  cell.landings * (catchFactor + seasonalPulse) +
                  cell.discards * (discardFactor - 1)
                ).toFixed(2),
              ),
            })),
          };
        }),
      }),
    ),
    salesData: {
      sales_summaries: baseDataset.salesData.sales_summaries.map((summary) => ({
        ...summary,
        sales: summary.sales.map((sale, saleIndex) => ({
          ...sale,
          quantity: Number(
            (sale.quantity * (salesFactor + saleIndex * 0.015)).toFixed(1),
          ),
          value: Number(
            (sale.value * (priceFactor + saleIndex * 0.01)).toFixed(2),
          ),
        })),
      })),
    },
    pricesData: {
      prices: baseDataset.pricesData.prices.map((point, priceIndex) => ({
        ...point,
        price: Number(
          (point.price * (priceFactor + priceIndex * 0.008)).toFixed(3),
        ),
      })),
    },
  };
};
