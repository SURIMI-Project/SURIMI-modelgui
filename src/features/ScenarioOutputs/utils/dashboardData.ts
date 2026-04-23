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

export const buildSimulatedHistoricalSeries = (
  values: number[],
  seriesSeed: number,
) => {
  if (values.length === 0) {
    return [];
  }

  const valueMin = Math.min(...values);
  const valueMax = Math.max(...values);
  const valueRange = Math.max(valueMax - valueMin, 0.0001);

  return values.map((value, index) => {
    const drift =
      Math.sin((index + 1) * (0.78 + seriesSeed * 0.08)) * 0.72 +
      Math.cos((index + 1) * (1.18 + seriesSeed * 0.06)) * 0.46;
    const sign = drift >= 0 ? 1 : -1;
    const amplitude =
      0.2 + Math.abs(Math.sin((index + 1) * (0.49 + seriesSeed * 0.05))) * 0.16;
    const offset = sign * valueRange * amplitude;

    return Number((value + offset).toFixed(3));
  });
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

export const buildSalesSeriesFromAverages = (
  annualMetricAverages: AnnualMetricAverages[],
  selectedSpeciesCodes: string[],
  salesQuantityBySpecies: Record<string, number>,
) => {
  const biomassTrend = normalizeSeries(
    annualMetricAverages.map((entry) => entry.biomass),
  );
  const landingsTrend = normalizeSeries(
    annualMetricAverages.map((entry) => entry.landings),
  );
  const discardsTrend = normalizeSeries(
    annualMetricAverages.map((entry) => entry.discards),
  );
  const baselineQuantity = selectedSpeciesCodes.reduce((sum, speciesCode) => {
    return sum + (salesQuantityBySpecies[speciesCode] ?? 140);
  }, 0);

  return annualMetricAverages.map((_, index) => {
    const cycle = Math.sin(index * 0.42 + baselineQuantity * 0.01) * 0.05;
    const multiplier = clamp(
      0.74 +
        landingsTrend[index] * 0.82 +
        biomassTrend[index] * 0.24 -
        discardsTrend[index] * 0.12 +
        cycle,
      0.45,
      1.8,
    );

    return Number((baselineQuantity * multiplier).toFixed(1));
  });
};

export const buildPriceSeriesFromAverages = (
  annualMetricAverages: AnnualMetricAverages[],
  selectedSpeciesCodes: string[],
  pricePerTonneBySpecies: Record<string, number>,
) => {
  const biomassTrend = normalizeSeries(
    annualMetricAverages.map((entry) => entry.biomass),
  );
  const landingsTrend = normalizeSeries(
    annualMetricAverages.map((entry) => entry.landings),
  );
  const discardsTrend = normalizeSeries(
    annualMetricAverages.map((entry) => entry.discards),
  );
  const baselinePriceAverage =
    selectedSpeciesCodes.reduce((sum, speciesCode) => {
      return sum + (pricePerTonneBySpecies[speciesCode] ?? 2200);
    }, 0) / Math.max(selectedSpeciesCodes.length, 1);

  return annualMetricAverages.map((_, index) => {
    const scarcity = 1 - (landingsTrend[index] ?? 0);
    const cycle = Math.cos(index * 0.31 + baselinePriceAverage * 0.0006) * 0.04;
    const multiplier = clamp(
      0.82 +
        scarcity * 0.34 +
        (discardsTrend[index] ?? 0) * 0.12 +
        (biomassTrend[index] ?? 0) * 0.08 +
        cycle,
      0.68,
      1.55,
    );

    return Number((baselinePriceAverage * multiplier).toFixed(0));
  });
};
