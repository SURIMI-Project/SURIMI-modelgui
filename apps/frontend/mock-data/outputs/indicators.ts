// Demonstration indicator formulas, not validated backend metrics.
import { type SpiderDiagramDatum } from "../../src/features/ScenarioOutputs/components/SpiderDiagram/SpiderDiagram";
import { type AnnualMetricAverages, clamp, normalizeSeries } from "../../src/features/ScenarioOutputs/utils/dashboardData";

const indicatorLabels = {
  economicRent: ["Economic", "rent"],
  socialBenefits: ["Social", "benefits"],
  speciesRebuilding: ["Species", "rebuilding"],
  biodiversity: "Biodiversity",
  ecosystemStructure: ["Ecosystem", "structure"],
} as const;

export const buildIndicatorSet = ({
  averages,
  scenarioSalesSeries,
  scenarioPriceSeries,
  selectedYearIndex,
}: {
  averages: AnnualMetricAverages[];
  scenarioSalesSeries: number[];
  scenarioPriceSeries: number[];
  selectedYearIndex: number;
}) => {
  if (averages.length === 0) {
    return [] as SpiderDiagramDatum[];
  }

  const biomassTrend = normalizeSeries(averages.map((entry) => entry.biomass));
  const landingsTrend = normalizeSeries(
    averages.map((entry) => entry.landings),
  );
  const discardsTrend = normalizeSeries(
    averages.map((entry) => entry.discards),
  );
  const salesTrend = normalizeSeries(scenarioSalesSeries);
  const priceTrend = normalizeSeries(scenarioPriceSeries);

  const biomassScore = biomassTrend[selectedYearIndex] ?? 0;
  const landingsScore = landingsTrend[selectedYearIndex] ?? 0;
  const discardsScore = discardsTrend[selectedYearIndex] ?? 0;
  const salesScore = salesTrend[selectedYearIndex] ?? 0;
  const priceScore = priceTrend[selectedYearIndex] ?? 0;

  const catchesValue = averages[selectedYearIndex]?.catches ?? 0;
  const discardsValue = averages[selectedYearIndex]?.discards ?? 0;
  const combinedCatch = Math.max(catchesValue + discardsValue, 0.0001);
  const efficiencyScore = clamp(catchesValue / combinedCatch, 0, 1);
  const harvestBalanceScore = clamp(
    1 - Math.abs(landingsScore - biomassScore),
    0,
    1,
  );
  const toPercent = (value: number) => Math.round(clamp(value, 0, 1) * 100);
  const buildDatum = (
    id: string,
    label: string | readonly string[],
    value: number,
    tooltipLabel?: string,
  ): SpiderDiagramDatum => ({
    id,
    label,
    tooltipLabel,
    value,
  });

  return [
    buildDatum(
      "economic_rent",
      indicatorLabels.economicRent,
      toPercent(salesScore * 0.48 + priceScore * 0.34 + efficiencyScore * 0.18),
      "Economic rent",
    ),
    buildDatum(
      "social_benefits",
      indicatorLabels.socialBenefits,
      toPercent(
        salesScore * 0.42 + landingsScore * 0.22 + efficiencyScore * 0.36,
      ),
      "Social benefits",
    ),
    buildDatum(
      "species_rebuilding",
      indicatorLabels.speciesRebuilding,
      toPercent(
        biomassScore * 0.58 +
          harvestBalanceScore * 0.24 +
          (1 - discardsScore) * 0.18,
      ),
      "Species rebuilding",
    ),
    buildDatum(
      "biodiversity",
      indicatorLabels.biodiversity,
      toPercent(
        biomassScore * 0.34 +
          (1 - discardsScore) * 0.34 +
          (1 - landingsScore) * 0.12 +
          harvestBalanceScore * 0.2,
      ),
    ),
    buildDatum(
      "ecosystem_structure",
      indicatorLabels.ecosystemStructure,
      toPercent(
        biomassScore * 0.42 +
          harvestBalanceScore * 0.28 +
          (1 - discardsScore) * 0.18 +
          priceScore * 0.12,
      ),
      "Ecosystem structure",
    ),
  ];
};

export const buildBaselineIndicatorData = (
  selectedYearIndex: number,
  years: number[],
): SpiderDiagramDatum[] => {
  const progress = years.length > 1 ? selectedYearIndex / (years.length - 1) : 0;
  const timelineAngle = progress * Math.PI * 2;
  const wave = (offset: number, amplitude: number, secondary = 0.04) => {
    return (
      0.56 +
      Math.sin(timelineAngle + offset) * amplitude +
      Math.cos(timelineAngle * 0.64 + offset * 0.5) * secondary
    );
  };
  const buildDatum = (
    id: string,
    label: string | readonly string[],
    value: number,
    tooltipLabel?: string,
  ): SpiderDiagramDatum => ({
    id,
    label,
    tooltipLabel,
    value,
  });

  return [
    buildDatum(
      "economic_rent",
      indicatorLabels.economicRent,
      Math.round(clamp(wave(0.2, 0.08, 0.03), 0, 1) * 100),
      "Economic rent",
    ),
    buildDatum(
      "social_benefits",
      indicatorLabels.socialBenefits,
      Math.round(clamp(wave(1.1, 0.07), 0, 1) * 100),
      "Social benefits",
    ),
    buildDatum(
      "species_rebuilding",
      indicatorLabels.speciesRebuilding,
      Math.round(clamp(wave(2.4, 0.06), 0, 1) * 100),
      "Species rebuilding",
    ),
    buildDatum(
      "biodiversity",
      indicatorLabels.biodiversity,
      Math.round(clamp(wave(3.3, 0.05), 0, 1) * 100),
    ),
    buildDatum(
      "ecosystem_structure",
      indicatorLabels.ecosystemStructure,
      Math.round(clamp(wave(4.1, 0.06, 0.03), 0, 1) * 100),
      "Ecosystem structure",
    ),
  ];
};
