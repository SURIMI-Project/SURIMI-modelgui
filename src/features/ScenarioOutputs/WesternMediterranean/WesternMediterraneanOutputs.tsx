import DashboardOutputsHeader from "../components/DashboardOutputsHeader/DashboardOutputsHeader";
import MapBiomassAndLandingsPanel from "../components/MapBiomassAndLandingsPanel/MapBiomassAndLandingsPanel";
import MarketIndicatorsPanel from "../components/MarketIndicatorsPanel/MarketIndicatorsPanel";
import YearRingDock from "../components/YearRingDock/YearRingDock";
import { getWesternMediterraneanRunDatasets } from "./data/getWesternMediterraneanRunDatasets";
import { useScenarioDashboardState } from "../hooks/useScenarioDashboardState";
import {
  buildDashboardHeaderModel,
  buildMapBiomassAndLandingsPanelModel,
  buildMarketIndicatorsPanelModel,
  buildYearDockModel,
} from "../utils/scenarioPanelModels";
import { buildScenarioSeriesBundle } from "../utils/scenarioSeriesBundle";
import styles from "../components/ScenarioOutputsShared/ScenarioOutputsShared.module.css";

type WesternMediterraneanOutputsProps = {
  runIds?: string[];
};

const WesternMediterraneanOutputs = ({
  runIds = [],
}: WesternMediterraneanOutputsProps) => {
  const datasets = getWesternMediterraneanRunDatasets(runIds);
  const primaryDataset = datasets[0] ?? null;
  const comparisonDataset = datasets[1] ?? null;
  const title =
    primaryDataset?.title ?? "Northwestern Mediterranean Scenario Outputs";
  const subtitle =
    primaryDataset?.subtitle ??
    "Dashboard of Scenario Outputs showcasing biomass, landings and discards as well as market indicators for the selected period.";
  const state = useScenarioDashboardState({
    dataset: primaryDataset,
  });
  const seriesBundle = buildScenarioSeriesBundle({
    caseId: "northwestern-mediterranean",
    primaryDataset,
    comparisonDataset,
    state,
  });
  const headerModel = buildDashboardHeaderModel({
    caseId: "northwestern-mediterranean",
    title,
    subtitle,
    primaryDataset,
    comparisonDataset,
    state,
    seriesBundle,
  });
  const primaryPanel = buildMapBiomassAndLandingsPanelModel({
    caseId: "northwestern-mediterranean",
    title,
    subtitle,
    primaryDataset,
    comparisonDataset,
    state,
    seriesBundle,
  });
  const marketPanel = buildMarketIndicatorsPanelModel({
    caseId: "northwestern-mediterranean",
    title,
    subtitle,
    primaryDataset,
    comparisonDataset,
    state,
    seriesBundle,
  });
  const yearDock = buildYearDockModel(state);

  return (
    <div data-case-id="northwestern-mediterranean">
      <DashboardOutputsHeader {...headerModel}>
        <div className={styles.layout}>
          <MapBiomassAndLandingsPanel {...primaryPanel} />
          <MarketIndicatorsPanel {...marketPanel} />
        </div>
      </DashboardOutputsHeader>

      <YearRingDock
        years={yearDock.years}
        currentYear={yearDock.currentYear}
        isPlaying={yearDock.isPlaying}
        isOpen={yearDock.isOpen}
        onTogglePlay={yearDock.onTogglePlay}
        onSelectYear={yearDock.onSelectYear}
        onToggleOpen={yearDock.onToggleOpen}
      />
    </div>
  );
};

export default WesternMediterraneanOutputs;
