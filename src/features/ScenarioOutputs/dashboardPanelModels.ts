import { type OutputsTrendChartSeries } from "./components/Charts/OutputsTrendChart";
import { type InformationLegendItem } from "./components/InformationLegends/InformationLegends";
import { type SpiderDiagramDatum } from "./components/SpiderDiagram/SpiderDiagram";
import type { HeatPoint, ScenarioOutputMetric, SpeciesOption } from "./types";

export type IndicatorPanelModel = {
  title: string;
  subtitle: string;
  dataLabel: string;
  data: SpiderDiagramDatum[];
  comparison: {
    label: string;
    data: SpiderDiagramDatum[];
  };
  valueSuffix: string;
};

export type DashboardHeaderModel = {
  title: string;
  subtitle: string;
  metric: ScenarioOutputMetric;
  onMetricChange: (next: ScenarioOutputMetric) => void;
  functionalGroupOptions: SpeciesOption[];
  selectedFunctionalGroup: string;
  onFunctionalGroupChange: (next: string) => void;
  speciesOptions: SpeciesOption[];
  selectedSpeciesCodes: string[];
  onSpeciesChange: (next: string[]) => void;
  selectedSpeciesLabels: string[];
  indicatorPanel: IndicatorPanelModel;
};

export type BiomassPanelModel = {
  currentValue: number;
  currentValueLabel: string;
  selectionCopy: string;
  historicalLabels: string[];
  historicalValues: number[];
  actualHistoricalValues: number[];
  futureLabels: string[];
  futureValues: number[];
  series?: OutputsTrendChartSeries[];
  lineColor: string;
  selectedIndex: number;
  onSelectIndex: (index: number) => void;
  legendItems: InformationLegendItem[];
};

export type LandingsPanelModel = {
  labels: string[];
  landingsValues: number[];
  discardsValues: number[];
  comparison?: {
    label: string;
    landingsValues: number[];
    discardsValues: number[];
  };
  selectedIndex: number;
  onSelectIndex: (index: number) => void;
  currentLabel: string;
  valueSuffix: string;
  yAxisLabel: string;
};

export type MapPanelModel = {
  subtitle: string;
  kicker: string;
  speciesCode: string;
  year: number;
  points: HeatPoint[];
  metricLabel: string;
  bounds: [number, number, number, number];
  valueDomain: {
    min: number;
    max: number;
  };
};

export type MapBiomassAndLandingsPanelModel = {
  metric: ScenarioOutputMetric;
  map: MapPanelModel;
  biomass: BiomassPanelModel;
  landings: LandingsPanelModel;
};

export type MarketTrendPanelModel = {
  currentValue: number;
  currentValueLabel: string;
  labels: string[];
  values?: number[];
  series?: OutputsTrendChartSeries[];
  selectedIndex: number;
  onSelectIndex: (index: number) => void;
  lineColor: string;
};

export type MarketIndicatorsPanelModel = {
  sales: MarketTrendPanelModel;
  prices: MarketTrendPanelModel;
};

export type YearDockModel = {
  years: number[];
  currentYear: number;
  isPlaying: boolean;
  isOpen: boolean;
  onTogglePlay: () => void;
  onSelectYear: (year: number) => void;
  onToggleOpen: () => void;
};
