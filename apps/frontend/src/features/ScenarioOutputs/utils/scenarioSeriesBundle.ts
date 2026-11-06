import { buildPriceSeriesFromAverages, buildSalesSeriesFromAverages } from "../../../../mock-data/outputs/chartSeries";
import { exampleSimulation } from "../../../../mock-data/simulation";
import type { SimulationCaseId } from "../../../data/simulationCases";
import {
  SCENARIO_ONE_LABEL,
  SCENARIO_TWO_LABEL,
} from "../scenarioCompare";
import {
  type AnnualMetricAverages,
  aggregateSpeciesOutput,
  buildAnnualMetricAverages,
  buildPricePerTonneBySpecies,
  buildSalesQuantityBySpecies,
} from "./dashboardData";
import type { ScenarioOutputsDataset } from "../types";
import type { ScenarioDashboardState } from "../hooks/useScenarioDashboardState";

export const metricMeta = {
  biomass: {
    label: "Biomass",
    unit: "t/km²",
    lineColor: "#74dbff",
  },
  landings: {
    label: "Landings & Discards",
    unit: "kg",
    lineColor: "#ffb36b",
  },
} as const;

export type ScenarioSeriesBundle = {
  annualMetricAverages: AnnualMetricAverages[];
  comparisonAnnualMetricAverages: AnnualMetricAverages[];
  biomassSeries: number[];
  comparisonBiomassSeries: number[];
  catchesSeries: number[];
  comparisonCatchesSeries: number[];
  discardsSeries: number[];
  comparisonDiscardsSeries: number[];
  salesSeries: number[];
  comparisonSalesSeries: number[];
  priceSeries: number[];
  comparisonPriceSeries: number[];
  activeSpeciesLabel: string;
  primaryRunLabel: string;
  comparisonRunLabel: string;
  primarySpeciesOutput: ReturnType<typeof aggregateSpeciesOutput> | null;
  comparisonSpeciesOutput: ReturnType<typeof aggregateSpeciesOutput> | null;
};

export const buildScenarioSeriesBundle = ({
  primaryDataset,
  comparisonDataset,
  state,
}: {
  caseId: SimulationCaseId;
  primaryDataset: ScenarioOutputsDataset | null;
  comparisonDataset: ScenarioOutputsDataset | null;
  state: ScenarioDashboardState;
}): ScenarioSeriesBundle => {
  const primarySpeciesOutput = primaryDataset
    ? aggregateSpeciesOutput(primaryDataset, [state.selectedSpeciesCode])
    : null;
  const comparisonSpeciesOutput = comparisonDataset
    ? aggregateSpeciesOutput(comparisonDataset, [state.selectedSpeciesCode])
    : null;

  const annualMetricAverages = buildAnnualMetricAverages(primarySpeciesOutput);
  const comparisonAnnualMetricAverages = buildAnnualMetricAverages(
    comparisonSpeciesOutput,
  );

  const biomassSeries = annualMetricAverages.map((entry) =>
    Number(entry.biomass.toFixed(3)),
  );
  const comparisonBiomassSeries = comparisonAnnualMetricAverages.map((entry) =>
    Number(entry.biomass.toFixed(3)),
  );
  const catchesSeries = annualMetricAverages.map((entry) =>
    Number(entry.catches.toFixed(3)),
  );
  const comparisonCatchesSeries = comparisonAnnualMetricAverages.map((entry) =>
    Number(entry.catches.toFixed(3)),
  );
  const discardsSeries = annualMetricAverages.map((entry) =>
    Number(entry.discards.toFixed(3)),
  );
  const comparisonDiscardsSeries = comparisonAnnualMetricAverages.map((entry) =>
    Number(entry.discards.toFixed(3)),
  );

  const primarySalesQuantityBySpecies = primaryDataset
    ? buildSalesQuantityBySpecies(primaryDataset)
    : {};
  const primaryPricePerTonneBySpecies = primaryDataset
    ? buildPricePerTonneBySpecies(primaryDataset)
    : {};
  const comparisonSalesQuantityBySpecies = comparisonDataset
    ? buildSalesQuantityBySpecies(comparisonDataset)
    : {};
  const comparisonPricePerTonneBySpecies = comparisonDataset
    ? buildPricePerTonneBySpecies(comparisonDataset)
    : {};

  const salesSeries = buildSalesSeriesFromAverages(
    annualMetricAverages,
    [state.selectedSpeciesCode],
    primarySalesQuantityBySpecies,
  );
  const priceSeries = buildPriceSeriesFromAverages(
    annualMetricAverages,
    [state.selectedSpeciesCode],
    primaryPricePerTonneBySpecies,
  );
  const comparisonSalesSeries = buildSalesSeriesFromAverages(
    comparisonAnnualMetricAverages,
    [state.selectedSpeciesCode],
    comparisonSalesQuantityBySpecies,
  );
  const comparisonPriceSeries = buildPriceSeriesFromAverages(
    comparisonAnnualMetricAverages,
    [state.selectedSpeciesCode],
    comparisonPricePerTonneBySpecies,
  );

  const primaryRunLabel =
    (primaryDataset ? exampleSimulation.title : undefined) ??
    primaryDataset?.runId ??
    SCENARIO_ONE_LABEL;
  const comparisonRunLabel =

    comparisonDataset?.runId ??
    SCENARIO_TWO_LABEL;

  return {
    annualMetricAverages,
    comparisonAnnualMetricAverages,
    biomassSeries,
    comparisonBiomassSeries,
    catchesSeries,
    comparisonCatchesSeries,
    discardsSeries,
    comparisonDiscardsSeries,
    salesSeries,
    comparisonSalesSeries,
    priceSeries,
    comparisonPriceSeries,
    activeSpeciesLabel: state.activeSpeciesLabel,
    primaryRunLabel,
    comparisonRunLabel,
    primarySpeciesOutput,
    comparisonSpeciesOutput,
  };
};
