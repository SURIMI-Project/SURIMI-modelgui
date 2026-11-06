// Synthetic chart series for the shared example only; these are not scientific output transformations.
import { type AnnualMetricAverages, clamp, normalizeSeries } from "../../src/features/ScenarioOutputs/utils/dashboardData";

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
