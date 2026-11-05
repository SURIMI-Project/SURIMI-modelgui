import { buildBiomassLegendItems } from "../../../../mock-data/content/biomassLegend";
import {
  type DashboardHeaderModel,
  type IndicatorPanelModel,
  type MapBiomassAndLandingsPanelModel,
  type MarketIndicatorsPanelModel,
  type YearDockModel,
} from "../dashboardPanelModels";
import type { SimulationCaseId } from "../../../data/simulationCases";
import type { ScenarioOutputsDataset } from "../types";
import type { ScenarioDashboardState } from "../hooks/useScenarioDashboardState";
import {
  BASELINE_LABEL,
  SCENARIO_COMPARE_COLORS,
  SCENARIO_ONE_LABEL,
  SCENARIO_TWO_LABEL,
} from "../scenarioCompare";
import {
  buildBaselineIndicatorData,
  buildIndicatorSet,
} from "../../../../mock-data/outputs/indicators";
import { buildSimulatedHistoricalSeries } from "../../../../mock-data/outputs/chartSeries";
import { metricMeta, type ScenarioSeriesBundle } from "./scenarioSeriesBundle";

type DashboardContext = {
  caseId: SimulationCaseId;
  title: string;
  subtitle: string;
  primaryDataset: ScenarioOutputsDataset | null;
  comparisonDataset: ScenarioOutputsDataset | null;
  state: ScenarioDashboardState;
  seriesBundle: ScenarioSeriesBundle;
};

const getSafeSelectedYearIndex = (selectedYearIndex: number) => {
  return Math.max(selectedYearIndex, 0);
};

export const buildDashboardHeaderModel = (
  context: DashboardContext,
): DashboardHeaderModel => {
  const safeSelectedYearIndex = getSafeSelectedYearIndex(
    context.state.selectedYearIndex,
  );

  const scenarioIndicatorData = buildIndicatorSet({
    averages: context.seriesBundle.annualMetricAverages,
    scenarioSalesSeries: context.seriesBundle.salesSeries,
    scenarioPriceSeries: context.seriesBundle.priceSeries,
    selectedYearIndex: safeSelectedYearIndex,
  });
  const comparisonIndicatorData = buildIndicatorSet({
    averages: context.seriesBundle.comparisonAnnualMetricAverages,
    scenarioSalesSeries: context.seriesBundle.comparisonSalesSeries,
    scenarioPriceSeries: context.seriesBundle.comparisonPriceSeries,
    selectedYearIndex: safeSelectedYearIndex,
  });

  const indicatorPanel: IndicatorPanelModel = {
    title: "Performance of Indicators",
    subtitle: context.comparisonDataset
      ? "Shows how the selected runs compare on the same indicator set."
      : "Shows how well the scenario applies to each indicator compared to the baseline.",
    datasets: [
      {
        label: BASELINE_LABEL,
        data: buildBaselineIndicatorData(
          safeSelectedYearIndex,
          context.state.years,
        ),
        borderColor: SCENARIO_COMPARE_COLORS.baseline.stroke,
        backgroundColor: SCENARIO_COMPARE_COLORS.baseline.fill,
        pointBackgroundColor: SCENARIO_COMPARE_COLORS.baseline.point,
      },
      {
        label: context.comparisonDataset
          ? SCENARIO_ONE_LABEL
          : context.seriesBundle.primaryRunLabel,
        data: scenarioIndicatorData,
        borderColor: SCENARIO_COMPARE_COLORS.scenarioOne.stroke,
        backgroundColor: SCENARIO_COMPARE_COLORS.scenarioOne.fill,
        pointBackgroundColor: SCENARIO_COMPARE_COLORS.scenarioOne.point,
      },
      ...(context.comparisonDataset
        ? [
            {
              label: SCENARIO_TWO_LABEL,
              data: comparisonIndicatorData,
              borderColor: SCENARIO_COMPARE_COLORS.scenarioTwo.stroke,
              backgroundColor: SCENARIO_COMPARE_COLORS.scenarioTwo.fill,
              pointBackgroundColor: SCENARIO_COMPARE_COLORS.scenarioTwo.point,
            },
          ]
        : []),
    ],
    valueSuffix: "%",
  };

  return {
    title: context.title,
    subtitle: context.subtitle,
    metric: context.state.metric,
    onMetricChange: context.state.onMetricChange,
    functionalGroupOptions: context.state.functionalGroupOptions,
    selectedFunctionalGroup: context.state.selectedFunctionalGroup,
    onFunctionalGroupChange: context.state.onFunctionalGroupChange,
    speciesOptions: context.state.filteredSpeciesOptions,
    selectedSpeciesCode: context.state.selectedSpeciesCode,
    onSpeciesChange: context.state.onSpeciesChange,
    selectedSpeciesLabels: context.state.selectedSpeciesLabels,
    indicatorPanel,
    compareLegendItems: [
      {
        label: context.comparisonDataset
          ? SCENARIO_ONE_LABEL
          : context.seriesBundle.primaryRunLabel || SCENARIO_ONE_LABEL,
        color: SCENARIO_COMPARE_COLORS.scenarioOne.stroke,
      },
      ...(context.comparisonDataset
        ? [
            {
              label: SCENARIO_TWO_LABEL,
              color: SCENARIO_COMPARE_COLORS.scenarioTwo.stroke,
            },
          ]
        : []),
    ],
  };
};

export const buildMapBiomassAndLandingsPanelModel = (
  context: DashboardContext,
): MapBiomassAndLandingsPanelModel => {
  const safeSelectedYearIndex = getSafeSelectedYearIndex(
    context.state.selectedYearIndex,
  );
  const forecastStartYear = context.primaryDataset?.forecastStartYear ?? 2026;
  const historicalLabels = context.state.years
    .filter((year) => year < forecastStartYear)
    .map(String);
  const futureLabels = context.state.years
    .filter((year) => year >= forecastStartYear)
    .map(String);

  const historicalBiomassSeries = context.seriesBundle.biomassSeries.slice(
    0,
    historicalLabels.length,
  );
  const futureBiomassSeries = context.seriesBundle.biomassSeries.slice(
    historicalLabels.length,
  );
  const simulatedHistoricalBiomassSeries = buildSimulatedHistoricalSeries(
    historicalBiomassSeries,
    1,
  );
  const comparisonHistoricalBiomassSeries =
    context.seriesBundle.comparisonBiomassSeries.slice(0, historicalLabels.length);
  const comparisonFutureBiomassSeries =
    context.seriesBundle.comparisonBiomassSeries.slice(historicalLabels.length);
  const comparisonSimulatedHistoricalBiomassSeries =
    buildSimulatedHistoricalSeries(comparisonHistoricalBiomassSeries, 2);

  const mapMetricDomain = (() => {
    const primaryValues =
      context.seriesBundle.primarySpeciesOutput?.annual_grids.flatMap((yearGrid) =>
        yearGrid.cells.map((cell) => cell[context.state.metric]),
      ) ?? [];
    const comparisonValues =
      context.seriesBundle.comparisonSpeciesOutput?.annual_grids.flatMap(
        (yearGrid) => yearGrid.cells.map((cell) => cell[context.state.metric]),
      ) ?? [];

    if (primaryValues.length === 0) {
      return { min: 0, max: 1 };
    }

    if (comparisonValues.length > 0) {
      const combinedValues = [...primaryValues, ...comparisonValues];
      return {
        min: Math.min(...combinedValues),
        max: Math.max(...combinedValues),
      };
    }

    return {
      min: Math.min(...primaryValues),
      max: Math.max(...primaryValues),
    };
  })();

  const activeYearGrid =
    context.seriesBundle.primarySpeciesOutput?.annual_grids.find(
      (yearGrid) => yearGrid.year === context.state.currentYear,
    ) ??
    context.seriesBundle.primarySpeciesOutput?.annual_grids[0] ??
    null;
  const comparisonActiveYearGrid =
    context.seriesBundle.comparisonSpeciesOutput?.annual_grids.find(
      (yearGrid) => yearGrid.year === context.state.currentYear,
    ) ??
    context.seriesBundle.comparisonSpeciesOutput?.annual_grids[0] ??
    null;

  return {
    metric: context.state.metric,
    map: {
      subtitle: context.primaryDataset?.mapSubtitle ?? context.subtitle,
      kicker: context.comparisonDataset
        ? `Year · ${context.state.currentYear} · ${SCENARIO_ONE_LABEL}`
        : `Year · ${context.state.currentYear}`,
      speciesCode: context.seriesBundle.activeSpeciesLabel,
      year: context.state.currentYear,
      points:
        activeYearGrid?.cells.map((cell) => ({
          longitude: cell.longitude,
          latitude: cell.latitude,
          value: cell[context.state.metric],
          speciesCode: context.seriesBundle.activeSpeciesLabel,
        })) ?? [],
      metricLabel: `${metricMeta[context.state.metric].label} (${metricMeta[context.state.metric].unit})`,
      bounds: [
        context.primaryDataset?.simulationMetadata.bounds.xmin ?? 0,
        context.primaryDataset?.simulationMetadata.bounds.ymin ?? 0,
        context.primaryDataset?.simulationMetadata.bounds.xmax ?? 1,
        context.primaryDataset?.simulationMetadata.bounds.ymax ?? 1,
      ],
      valueDomain: mapMetricDomain,
    },
    comparisonMap: comparisonActiveYearGrid
      ? {
          subtitle: context.primaryDataset?.mapSubtitle ?? context.subtitle,
          kicker: `Year · ${context.state.currentYear} · ${SCENARIO_TWO_LABEL}`,
          speciesCode: context.seriesBundle.activeSpeciesLabel,
          year: context.state.currentYear,
          points: comparisonActiveYearGrid.cells.map((cell) => ({
            longitude: cell.longitude,
            latitude: cell.latitude,
            value: cell[context.state.metric],
            speciesCode: context.seriesBundle.activeSpeciesLabel,
          })),
          metricLabel: `${metricMeta[context.state.metric].label} (${metricMeta[context.state.metric].unit})`,
          bounds: [
            context.primaryDataset?.simulationMetadata.bounds.xmin ?? 0,
            context.primaryDataset?.simulationMetadata.bounds.ymin ?? 0,
            context.primaryDataset?.simulationMetadata.bounds.xmax ?? 1,
            context.primaryDataset?.simulationMetadata.bounds.ymax ?? 1,
          ],
          valueDomain: mapMetricDomain,
        }
      : undefined,
    biomass: {
      currentValue: context.seriesBundle.biomassSeries[safeSelectedYearIndex] ?? 0,
      currentValueLabel: context.comparisonDataset
        ? `${(context.seriesBundle.biomassSeries[safeSelectedYearIndex] ?? 0).toFixed(2)} ${metricMeta.biomass.unit} vs ${(context.seriesBundle.comparisonBiomassSeries[safeSelectedYearIndex] ?? 0).toFixed(2)} ${metricMeta.biomass.unit}`
        : `${(context.seriesBundle.biomassSeries[safeSelectedYearIndex] ?? 0).toFixed(2)} ${metricMeta.biomass.unit}`,
      selectionCopy: `Selected year biomass: ${(context.seriesBundle.biomassSeries[safeSelectedYearIndex] ?? 0).toFixed(2)} ${metricMeta.biomass.unit}`,
      historicalLabels,
      historicalValues: historicalBiomassSeries,
      simulatedHistoricalValues: simulatedHistoricalBiomassSeries,
      futureLabels,
      futureValues: futureBiomassSeries,
      series: context.comparisonDataset
        ? [
            {
              label: SCENARIO_ONE_LABEL,
              color: SCENARIO_COMPARE_COLORS.scenarioOne.stroke,
              historicalValues: historicalBiomassSeries,
              simulatedHistoricalValues: simulatedHistoricalBiomassSeries,
              futureValues: futureBiomassSeries,
            },
            {
              label: SCENARIO_TWO_LABEL,
              color: SCENARIO_COMPARE_COLORS.scenarioTwo.stroke,
              historicalValues: comparisonHistoricalBiomassSeries,
              simulatedHistoricalValues: comparisonSimulatedHistoricalBiomassSeries,
              futureValues: comparisonFutureBiomassSeries,
            },
          ]
        : undefined,
      lineColor: metricMeta.biomass.lineColor,
      selectedIndex: safeSelectedYearIndex,
      onSelectIndex: context.state.onSelectYearByIndex,
      legendItems: buildBiomassLegendItems(),
    },
    landings: {
      labels: context.state.years.map(String),
      landingsValues: context.seriesBundle.catchesSeries,
      discardsValues: context.seriesBundle.discardsSeries,
      comparison: context.comparisonDataset
        ? {
            label: SCENARIO_TWO_LABEL,
            landingsValues: context.seriesBundle.comparisonCatchesSeries,
            discardsValues: context.seriesBundle.comparisonDiscardsSeries,
          }
        : undefined,
      selectedIndex: safeSelectedYearIndex,
      onSelectIndex: context.state.onSelectYearByIndex,
      currentLabel: `${context.seriesBundle.activeSpeciesLabel} · ${context.state.currentYear}`,
      valueSuffix: ` ${metricMeta.landings.unit}`,
      yAxisLabel: metricMeta.landings.unit,
    },
  };
};

export const buildMarketIndicatorsPanelModel = (
  context: DashboardContext,
): MarketIndicatorsPanelModel => {
  const safeSelectedYearIndex = getSafeSelectedYearIndex(
    context.state.selectedYearIndex,
  );

  return {
    sales: {
      currentValue: context.seriesBundle.salesSeries[safeSelectedYearIndex] ?? 0,
      currentValueLabel: context.comparisonDataset
        ? `${(context.seriesBundle.salesSeries[safeSelectedYearIndex] ?? 0).toFixed(1)} t vs ${(context.seriesBundle.comparisonSalesSeries[safeSelectedYearIndex] ?? 0).toFixed(1)} t`
        : `${(context.seriesBundle.salesSeries[safeSelectedYearIndex] ?? 0).toFixed(1)} t`,
      labels: context.state.years.map(String),
      values: context.comparisonDataset
        ? undefined
        : context.seriesBundle.salesSeries,
      series: context.comparisonDataset
        ? [
            {
              label: SCENARIO_ONE_LABEL,
              color: SCENARIO_COMPARE_COLORS.scenarioOne.stroke,
              values: context.seriesBundle.salesSeries,
            },
            {
              label: SCENARIO_TWO_LABEL,
              color: SCENARIO_COMPARE_COLORS.scenarioTwo.stroke,
              values: context.seriesBundle.comparisonSalesSeries,
            },
          ]
        : undefined,
      selectedIndex: safeSelectedYearIndex,
      onSelectIndex: context.state.onSelectYearByIndex,
      lineColor: SCENARIO_COMPARE_COLORS.scenarioOne.stroke,
    },
    prices: {
      currentValue: context.seriesBundle.priceSeries[safeSelectedYearIndex] ?? 0,
      currentValueLabel: context.comparisonDataset
        ? `EUR ${(context.seriesBundle.priceSeries[safeSelectedYearIndex] ?? 0).toFixed(0)}/t vs EUR ${(context.seriesBundle.comparisonPriceSeries[safeSelectedYearIndex] ?? 0).toFixed(0)}/t`
        : `EUR ${(context.seriesBundle.priceSeries[safeSelectedYearIndex] ?? 0).toFixed(0)}/t`,
      labels: context.state.years.map(String),
      values: context.comparisonDataset
        ? undefined
        : context.seriesBundle.priceSeries,
      series: context.comparisonDataset
        ? [
            {
              label: SCENARIO_ONE_LABEL,
              color: SCENARIO_COMPARE_COLORS.scenarioOne.stroke,
              values: context.seriesBundle.priceSeries,
            },
            {
              label: SCENARIO_TWO_LABEL,
              color: SCENARIO_COMPARE_COLORS.scenarioTwo.stroke,
              values: context.seriesBundle.comparisonPriceSeries,
            },
          ]
        : undefined,
      selectedIndex: safeSelectedYearIndex,
      onSelectIndex: context.state.onSelectYearByIndex,
      lineColor: SCENARIO_COMPARE_COLORS.scenarioOne.stroke,
    },
  };
};

export const buildYearDockModel = (
  state: ScenarioDashboardState,
): YearDockModel => {
  return {
    years: state.years,
    currentYear: state.currentYear,
    isPlaying: state.isPlaying,
    isOpen: state.isYearDockOpen,
    onTogglePlay: state.onTogglePlay,
    onSelectYear: state.onSelectYear,
    onToggleOpen: state.onToggleYearDock,
  };
};
