import type { ScenarioOutputsDataset, SpeciesAnnualOutput } from "../types";

export type AnnualMetricAverages = {
  year: number;
  biomass: number;
  landings: number;
  catches: number;
  discards: number;
};

export const average = (values: number[]) => {
  if (values.length === 0) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
};

export const clamp = (value: number, min: number, max: number) => {
  return Math.min(max, Math.max(min, value));
};

export const normalizeSeries = (values: number[]) => {
  if (values.length === 0) {
    return [];
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = Math.max(max - min, 0.0001);

  return values.map((value) => (value - min) / span);
};

export const buildSalesQuantityBySpecies = (
  dataset: ScenarioOutputsDataset,
) => {
  return dataset.salesData.sales_summaries.reduce<Record<string, number>>(
    (accumulator, summary) => {
      summary.sales.forEach((sale) => {
        accumulator[sale.species.species_code] =
          (accumulator[sale.species.species_code] ?? 0) + sale.quantity;
      });

      return accumulator;
    },
    {},
  );
};

export const buildPricePerTonneBySpecies = (
  dataset: ScenarioOutputsDataset,
) => {
  return dataset.pricesData.prices.reduce<Record<string, number>>(
    (accumulator, point) => {
      accumulator[point.species.species_code] = point.price * 1000;
      return accumulator;
    },
    {},
  );
};

export const aggregateSpeciesOutput = (
  dataset: ScenarioOutputsDataset,
  selectedSpeciesCodes: string[],
): SpeciesAnnualOutput | null => {
  const relevantOutputs = dataset.species_outputs.filter((entry) =>
    selectedSpeciesCodes.includes(entry.species_code),
  );

  if (relevantOutputs.length === 0) {
    return null;
  }

  return {
    species_code: selectedSpeciesCodes.join(","),
    annual_grids: relevantOutputs[0].annual_grids.map(
      (yearGrid, yearIndex) => ({
        year: yearGrid.year,
        cells: yearGrid.cells.map((baseCell, cellIndex) => {
          return relevantOutputs.reduce(
            (accumulator, speciesOutput) => {
              const cell =
                speciesOutput.annual_grids[yearIndex]?.cells[cellIndex] ??
                baseCell;

              return {
                longitude: baseCell.longitude,
                latitude: baseCell.latitude,
                biomass: accumulator.biomass + cell.biomass,
                landings: accumulator.landings + cell.landings,
                catches: accumulator.catches + cell.catches,
                discards: accumulator.discards + cell.discards,
              };
            },
            {
              longitude: baseCell.longitude,
              latitude: baseCell.latitude,
              biomass: 0,
              landings: 0,
              catches: 0,
              discards: 0,
            },
          );
        }),
      }),
    ),
  };
};

export const buildAnnualMetricAverages = (
  speciesOutput: SpeciesAnnualOutput | null,
): AnnualMetricAverages[] => {
  if (!speciesOutput) {
    return [];
  }

  return speciesOutput.annual_grids.map((yearGrid) => ({
    year: yearGrid.year,
    biomass: average(yearGrid.cells.map((cell) => cell.biomass)),
    landings: average(yearGrid.cells.map((cell) => cell.landings)),
    catches: average(yearGrid.cells.map((cell) => cell.catches)),
    discards: average(yearGrid.cells.map((cell) => cell.discards)),
  }));
};
