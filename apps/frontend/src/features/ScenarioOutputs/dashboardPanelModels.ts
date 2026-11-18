import { type OutputsTrendChartSeries } from "./components/Charts/OutputsTrendChart";
import { type InformationLegendItem } from "./components/InformationLegends/InformationLegends";
import { type SpiderDiagramSeries } from "./components/SpiderDiagram/SpiderDiagram";
import type { HeatPoint, ScenarioOutputMetric, SpeciesOption } from "./types";

export type IndicatorPanelModel = {
  title: string;
  subtitle: string;
  datasets: SpiderDiagramSeries[];
  valueSuffix: string;
  emptyMessage?: string;
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
  selectedSpeciesCode: string;
  onSpeciesChange: (next: string) => void;
  selectedSpeciesLabels: string[];
  indicatorPanel?: IndicatorPanelModel;
  showTitle?: boolean;
  showSelectedSpecies?: boolean;
  compareLegendItems: Array<{
    label: string;
    color: string;
  }>;
};

export type BiomassPanelModel = {
  currentValue: number | null;
  currentValueLabel: string;
  selectionCopy: string;
  labels?: string[];
  isRecorded?: boolean;
  statusMessage?: string;
  historicalLabels?: string[];
  historicalValues?: number[];
  simulatedHistoricalValues?: number[];
  futureLabels?: string[];
  futureValues?: number[];
  series?: OutputsTrendChartSeries[];
  lineColor: string;
  selectedIndex: number;
  onSelectIndex: (index: number) => void;
  legendItems: InformationLegendItem[];
};

export type LandingsPanelModel = {
  statusMessage?: string;
  runLabel: string;
  labels: string[];
  landingsValues: (number | null)[];
  discardsValues: (number | null)[];
  comparison?: {
    label: string;
    landingsValues: (number | null)[];
    discardsValues: (number | null)[];
  };
  selectedIndex: number;
  onSelectIndex: (index: number) => void;
  currentLabel: string;
  valueSuffix: string;
  yAxisLabel: string;
};

export type MapPanelModel = {
  runLabel: string;
  subtitle: string;
  kicker: string;
  speciesCode: string;
  year: number;
  points: HeatPoint[];
  metricLabel: string;
  bounds: [number, number, number, number];
  isLoading?: boolean;
  error?: string;
  onRetry?: () => void;
  valueDomain: {
    min: number;
    max: number;
  };
};

export type MapBiomassAndLandingsPanelModel = {
  metric: ScenarioOutputMetric;
  map: MapPanelModel;
  comparisonMap?: MapPanelModel;
  biomass: BiomassPanelModel;
  landings: LandingsPanelModel;
};

export type MarketTrendPanelModel = {
  title?: string;
  subtitle?: string;
  metricLabel?: string;
  selectionCopy?: string;
  isRecorded?: boolean;
  statusMessage?: string;
  currentValue: number | null;
  currentValueLabel: string;
  labels: string[];
  values?: number[];
  series?: OutputsTrendChartSeries[];
  selectedIndex: number;
  onSelectIndex: (index: number) => void;
  lineColor: string;
};

export type MarketIndicatorsPanelModel = {
  title?: string;
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
