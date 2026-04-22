import { getScenarioRunById } from "../../ScenarioRuns/mockScenarioRuns";
import type { SimulationCaseId } from "../../../data/simulationCases";
import {
  type AnnualMetricAverages,
  aggregateSpeciesOutput,
  buildAnnualMetricAverages,
  buildPricePerTonneBySpecies,
  buildPriceSeriesFromAverages,
  buildSalesQuantityBySpecies,
  buildSalesSeriesFromAverages,
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
  caseId,
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
    ? aggregateSpeciesOutput(primaryDataset, state.selectedSpeciesCodes)
    : null;
  const comparisonSpeciesOutput = comparisonDataset
    ? aggregateSpeciesOutput(comparisonDataset, state.selectedSpeciesCodes)
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
    state.selectedSpeciesCodes,
    primarySalesQuantityBySpecies,
  );
  const priceSeries = buildPriceSeriesFromAverages(
    annualMetricAverages,
    state.selectedSpeciesCodes,
    primaryPricePerTonneBySpecies,
  );
  const comparisonSalesSeries = buildSalesSeriesFromAverages(
    comparisonAnnualMetricAverages,
    state.selectedSpeciesCodes,
    comparisonSalesQuantityBySpecies,
  );
  const comparisonPriceSeries = buildPriceSeriesFromAverages(
    comparisonAnnualMetricAverages,
    state.selectedSpeciesCodes,
    comparisonPricePerTonneBySpecies,
  );

  const primaryRunLabel =
    (primaryDataset && getScenarioRunById(caseId, primaryDataset.runId)?.title) ??
    primaryDataset?.runId ??
    "Scenario";
  const comparisonRunLabel =
    (comparisonDataset &&
      getScenarioRunById(caseId, comparisonDataset.runId)?.title) ??
    comparisonDataset?.runId ??
    "Comparison";

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
