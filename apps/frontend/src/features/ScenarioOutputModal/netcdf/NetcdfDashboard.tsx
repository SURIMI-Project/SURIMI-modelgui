import { useEffect, useMemo, useState, type ReactNode } from "react";
import GenericScenarionOutputSkeleton from "../components/GenericScenarionOutputSkeleton";
import Button from "../../../components/ui/Button/Button";
import { simulationCaseStudies } from "../../../data/simulationCases";
import { useNetcdfReader } from "../../../serverState/outputs/useNetcdfReader";
import { useExperimentOptions } from "../../../serverState/scenarios/useExperimentOptions";
import { readChartTheme } from "../../../styles/chartTheme";
import type { ScenarioOutputsViewProps } from "../../ScenarioOutputs/ScenarioOutputsView";
import type { DashboardHeaderModel, MapBiomassAndLandingsPanelModel, MapPanelModel, MarketIndicatorsPanelModel, MarketTrendPanelModel } from "../../ScenarioOutputs/dashboardPanelModels";
import type { HeatPoint, ScenarioOutputMetric } from "../../ScenarioOutputs/types";
import type { AnnualPoint, FileMetadata, OutputGrid, OutputSource, SpeciesSeries } from "./types";
import styles from "../ScenarioOutputModal.module.css";

type Reader = ReturnType<typeof useNetcdfReader>;
export default function NetcdfDashboard({ sources, onClose, renderDashboard }: { sources: OutputSource[]; onClose: () => void; renderDashboard: (props: ScenarioOutputsViewProps) => ReactNode }) {
  const primary = useNetcdfReader(sources[0]);
  const comparison = useNetcdfReader(sources[1]);
  if (sources.length > 2 || !sources[0] || sources.some(source => source.scenarioName !== sources[0].scenarioName)) return <p role="alert">Select one or two runs from the same case study.</p>;
  const failed = primary.error ? primary : sources[1] && comparison.error ? comparison : undefined;
  if (failed) return <div className={styles.state} role="alert"><p>{failed.error}</p><Button variant="primary-outlined" onPress={failed.retry}>TRY AGAIN</Button></div>;
  if (!primary.metadata || (sources[1] && !comparison.metadata)) return <GenericScenarionOutputSkeleton
    status={!primary.metadata ? primary.progress.message : comparison.progress.message} />;
  return <LoadedDashboard sources={sources} primary={primary} comparison={sources[1] ? comparison : undefined} metadata={primary.metadata} onClose={onClose} renderDashboard={renderDashboard} />;
}
function useSeries(reader: Reader | undefined, species: number | undefined, dates?: string[]) {
  const [result, setResult] = useState<{ key: string; data?: SpeciesSeries; error?: string } | null>(null);
  const request = reader?.request;
  const key = JSON.stringify([species, dates]);
  useEffect(() => {
    if (!request || species === undefined) return;
    let active = true;
    void request<SpeciesSeries>("series", { species, dates }).then(data => { if (active) setResult({ key, data }); })
      .catch(error => { if (active) setResult({ key, error: String(error.message ?? error) }); });
    return () => { active = false; };
  }, [request, species, dates, key]);
  return result?.key === key ? result : null;
}
function useGrid(reader: Reader | undefined, species: number | undefined, year: number | undefined, metric: string, dates?: string[]) {
  const [result, setResult] = useState<{ key: string; data?: OutputGrid; error?: string } | null>(null);
  const [attempt, setAttempt] = useState(0);
  const request = reader?.request;
  const key = JSON.stringify([species, year, metric, dates, attempt]);
  useEffect(() => {
    if (!request || species === undefined || year === undefined) return;
    let active = true;
    void request<OutputGrid>("grid", { species, year, metric, dates }).then(data => { if (active) setResult({ key, data }); })
      .catch(error => { if (active) setResult({ key, error: String(error.message ?? error) }); });
    return () => { active = false; };
  }, [request, species, year, metric, dates, key]);
  return { result: result?.key === key ? result : null, retry: () => setAttempt(value => value + 1) };
}
function gridPoints(grid: OutputGrid | undefined, metadata: FileMetadata | null | undefined, code: string): HeatPoint[] {
  if (!grid || !metadata) return [];
  return grid.values.flatMap((value, index) => value === null ? [] : [{
    latitude: metadata.lat[Math.floor(index / metadata.lon.length)],
    longitude: metadata.lon[index % metadata.lon.length], value, speciesCode: code,
  }]);
}
const currentValue = (points: AnnualPoint[] | undefined, year: number) => points?.find(point => point.year === year)?.value ?? null;
const formatValue = (value: number | null) => value === null ? "—" : value.toLocaleString("en", { maximumFractionDigits: 2 });
const annualValues = (points: AnnualPoint[] | undefined, years: number[]) => years.map(year => currentValue(points, year));

// Adapter only: file selections and decoded data feed the existing dashboard models.
function LoadedDashboard({ sources, primary, comparison, metadata, onClose, renderDashboard }: {
  sources: OutputSource[]; primary: Reader; comparison?: Reader; metadata: FileMetadata; onClose: () => void; renderDashboard: (props: ScenarioOutputsViewProps) => ReactNode;
}) {
  const names = useExperimentOptions(sources[0].scenarioName);
  const [speciesKey, setSpeciesKey] = useState(metadata.species[0]?.key ?? "");
  const [group, setGroup] = useState("all");
  const [metric, setMetric] = useState<ScenarioOutputMetric>("biomass");
  const [year, setYear] = useState(metadata.years[0]);
  const [playing, setPlaying] = useState(false);
  const [wheel, setWheel] = useState(false);
  const [presented, setPresented] = useState(false);
  const theme = readChartTheme();
  const displaySpecies = metadata.species.map(entry => {
    const match = names.data?.species.find(species => species.species_code === entry.code && species.life_stage === entry.stage);
    return { ...entry, label: `${match?.species_name ?? entry.code}${entry.stage ? ` · ${entry.stage}` : ""}${match?.species_name ? ` (${entry.code})` : ""}`, group: match?.functional_group ?? "unmapped", groupName: match?.functional_group_name ?? match?.functional_group ?? "Unmapped entries" };
  });
  const available = displaySpecies.filter(entry => !comparison || (metadata.species.filter(other => other.code === entry.code && other.stage === entry.stage).length === 1 && comparison.metadata?.species.filter(other => other.code === entry.code && other.stage === entry.stage).length === 1));
  const filtered = available.filter(entry => group === "all" || entry.group === group);
  const selected = filtered.find(entry => entry.key === speciesKey) ?? filtered[0];
  const otherSpecies = comparison?.metadata?.species.find(entry => entry.code === selected?.code && entry.stage === selected?.stage);
  const otherMetadata = comparison?.metadata;
  const commonDates = useMemo(() => {
    if (!otherMetadata) return undefined;
    const otherDates = new Set(otherMetadata.dates);
    return metadata.dates.filter(date => otherDates.has(date));
  }, [metadata, otherMetadata]);
  const first = useSeries(primary, selected?.index, commonDates);
  const second = useSeries(comparison, otherSpecies?.index, commonDates);
  const years = useMemo(() => commonDates ? [...new Set(commonDates.map(date => Number(date.slice(0, 4))))] : metadata.years, [metadata, commonDates]);
  const selectedYear = years.includes(year) ? year : years[0];
  const gridMetric = metric === "biomass" ? "biomass" : "gross_catch";
  const firstGrid = useGrid(primary, selected?.index, selectedYear, gridMetric, commonDates);
  const secondGrid = useGrid(comparison, otherSpecies?.index, selectedYear, gridMetric, commonDates);
  useEffect(() => {
    if (!playing || years.length < 2) return;
    const timer = window.setInterval(() => setYear(current => years[(Math.max(0, years.indexOf(current)) + 1) % years.length]), 1600);
    return () => window.clearInterval(timer);
  }, [playing, years]);
  const selectYear = (next: number) => { setPlaying(false); setYear(next); };
  const selectIndex = (index: number) => { if (years[index] !== undefined) selectYear(years[index]); };
  const selectedIndex = Math.max(0, years.indexOf(selectedYear));
  const points = gridPoints(firstGrid.result?.data, metadata, selected?.code ?? "");
  const comparisonPoints = gridPoints(secondGrid.result?.data, otherMetadata, selected?.code ?? "");
  const values = [...points, ...comparisonPoints].map(point => point.value);
  const domain = values.length ? { min: Math.min(...values), max: Math.max(...values) } : { min: 0, max: 1 };
  const chartSeries = (key: keyof SpeciesSeries) => [{ label: sources[0].name, values: annualValues(first?.data?.[key], years), color: theme.series ?? "" }, ...(sources[1] ? [{ label: sources[1].name, values: annualValues(second?.data?.[key], years), color: theme.comparison ?? "" }] : [])];
  const seriesStatus = first?.error ?? second?.error ?? (!first || (comparison && !second) ? "Reading selected species…" : undefined);
  const mapModel = (index: number, file: FileMetadata, grid: ReturnType<typeof useGrid>, cells: HeatPoint[]): MapPanelModel => ({
    runLabel: sources[index].name,
    subtitle: metric === "biomass" ? "Mean recorded biomass per grid cell for the selected year and species." : "Recorded gross catch, summed across fleets and time steps for the selected year and species.",
    kicker: `Year · ${selectedYear}`, speciesCode: selected?.code ?? "", year: selectedYear, points: cells,
    metricLabel: `${metric === "biomass" ? "Biomass" : "Gross catch"} (tonnes/cell)`,
    bounds: [Math.min(...file.lon), Math.min(...file.lat), Math.max(...file.lon), Math.max(...file.lat)],
    valueDomain: domain, isLoading: !grid.result, error: grid.result?.error, onRetry: grid.retry,
  });
  const labels = years.map(String);
  const marketModel = (key: "sales" | "unitValue"): MarketTrendPanelModel => ({
    currentValue: currentValue(first?.data?.[key], selectedYear),
    currentValueLabel: `${formatValue(currentValue(first?.data?.[key], selectedYear))} ${key === "sales" ? "t" : "EUR/t"}`,
    labels, series: chartSeries(key), selectedIndex, onSelectIndex: selectIndex, lineColor: theme.series ?? "", isRecorded: true, statusMessage: seriesStatus,
    ...(key === "unitValue" ? { title: "Realised unit value", subtitle: "Sales value per tonne over time", metricLabel: "EUR / tonne", selectionCopy: "Recorded sales value divided by sales quantity; not the raw market-price variable." }
      : { selectionCopy: "Recorded sales quantity summed across time steps, fleets and markets." }),
  });
  const caseStudy = simulationCaseStudies.find(study => study.scenarioName === sources[0].scenarioName);
  const header: DashboardHeaderModel = {
    title: `${caseStudy?.seaName ?? "Scenario"} · Scenario outputs`,
    subtitle: `${sources.some(source => source.sampleUrl) ? "Sample NetCDF · separate from local simulations. " : ""}Biomass, landings, discards and market outputs for the selected period.`,
    metric, onMetricChange: setMetric,
    functionalGroupOptions: [{ value: "all", label: "All functional groups" }, ...new Map(available.map(entry => [entry.group, { value: entry.group, label: entry.groupName }])).values()],
    selectedFunctionalGroup: group, onFunctionalGroupChange: setGroup,
    speciesOptions: filtered.map(entry => ({ value: entry.key, label: entry.label })),
    selectedSpeciesCode: selected?.key ?? "", onSpeciesChange: setSpeciesKey, selectedSpeciesLabels: selected ? [selected.label] : [],
    showTitle: false, showSelectedSpecies: false,
    compareLegendItems: sources.map((source, index) => ({ label: source.name, color: (index ? theme.comparison : theme.series) ?? "" })),
  };
  const primaryPanel: MapBiomassAndLandingsPanelModel = {
    metric, map: mapModel(0, metadata, firstGrid, points),
    comparisonMap: otherMetadata ? mapModel(1, otherMetadata, secondGrid, comparisonPoints) : undefined,
    biomass: {
      currentValue: currentValue(first?.data?.biomass, selectedYear), currentValueLabel: `${formatValue(currentValue(first?.data?.biomass, selectedYear))} t`,
      labels, series: chartSeries("biomass"), isRecorded: true, statusMessage: seriesStatus,
      selectionCopy: `Selected year biomass: ${formatValue(currentValue(first?.data?.biomass, selectedYear))} tonnes. Mean of recorded snapshots; partial years use available records.`,
      lineColor: theme.series ?? "", selectedIndex, onSelectIndex: selectIndex,
      legendItems: sources.map((source, index) => ({ label: source.name, description: "Annual mean of recorded stock biomass, in tonnes. Comparisons use common time records. Missing values remain gaps.", marker: "line", color: (index ? theme.comparison : theme.series) ?? "" })),
    },
    landings: {
      runLabel: sources[0].name, labels,
      landingsValues: annualValues(first?.data?.landings, years), discardsValues: annualValues(first?.data?.discards, years),
      comparison: sources[1] ? { label: sources[1].name, landingsValues: annualValues(second?.data?.landings, years), discardsValues: annualValues(second?.data?.discards, years) } : undefined,
      selectedIndex, onSelectIndex: selectIndex, currentLabel: String(selectedYear), valueSuffix: " t", yAxisLabel: "Recorded landings and discards (tonnes)", statusMessage: seriesStatus,
    },
  };
  const marketPanel: MarketIndicatorsPanelModel = { title: "Sales volume and realised unit value trends", sales: marketModel("sales"), prices: marketModel("unitValue") };
  if (!selected || !years.length) return <p className={styles.state} role="status">These runs have no matching species/life stage or time records.</p>;
  const initialReady = Boolean(first && firstGrid.result && (!comparison || (second && secondGrid.result)));
  if (!presented && initialReady) setPresented(true);
  if (!presented && !initialReady) return <GenericScenarionOutputSkeleton status="Reading initial charts and map…" />;
  return renderDashboard({
    embedded: true, header, primaryPanel, marketPanel,
    backHref: `/scenario-runs${caseStudy ? `?case=${caseStudy.id}` : ""}`, onBack: onClose,
    yearDock: { years, currentYear: selectedYear, isPlaying: playing, isOpen: wheel, onTogglePlay: () => setPlaying(value => !value), onSelectYear: selectYear, onToggleOpen: () => setWheel(value => !value) },
  });
}
