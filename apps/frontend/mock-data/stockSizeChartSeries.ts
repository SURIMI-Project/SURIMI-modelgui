import type { StockMockData } from "./cmsy";

const normalizeBiomassValue = (rawBiomass: number, bmsy: number) => {
  let normalized = rawBiomass;

  // Some source values appear one order of magnitude too high.
  while (normalized / bmsy > 2) {
    normalized /= 10;
  }

  return normalized;
};

// Prototype normalization and synthetic bands, not actual confidence intervals.
export const buildExampleStockSizeSeries = (stock: StockMockData) => {
  const { stockSize } = stock;

  const observedYears = stockSize.series
    .filter(
      (point) =>
        point.biomass !== null &&
        point.biomass !== stockSize.unavailableRawValue,
    )
    .map((point) => point.year);

  const lastObservedYear =
    observedYears.length > 0 ? Math.max(...observedYears) : 2012;

  const points = stockSize.series
    .filter((point) => point.year >= 1985 && point.year <= lastObservedYear)
    .map((point) => {
      const isUnavailable =
        point.biomass === null || point.biomass === stockSize.unavailableRawValue;

      let ratio = stockSize.defaultRatio;

      if (!isUnavailable && point.biomass !== null) {
        ratio = normalizeBiomassValue(point.biomass, stockSize.bmsy) / stockSize.bmsy;
      }

      return {
        year: point.year,
        ratio,
      };
    });

  const labels = points.map((point) => point.year.toString());
  const ratioSeries = points.map((point) => point.ratio);
  const center = (points.length - 1) / 2;

  const spreadSeries = points.map((_, index) => {
    const edgeDistance = Math.abs(index - center) / center;
    return 0.055 + 0.05 * edgeDistance;
  });

  const lowerBand = ratioSeries.map((value, i) => Math.max(0, value - spreadSeries[i]));
  const upperBand = ratioSeries.map((value, i) => Math.min(2, value + spreadSeries[i]));

  return { labels, lowerBand, upperBand, ratioSeries };
};
