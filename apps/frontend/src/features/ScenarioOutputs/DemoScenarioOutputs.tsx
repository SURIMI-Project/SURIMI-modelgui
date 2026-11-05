import type { SimulationCaseId } from "../../data/simulationCases";
import DashboardOutputsHeader from "./components/DashboardOutputsHeader/DashboardOutputsHeader";
import MapBiomassAndLandingsPanel from "./components/MapBiomassAndLandingsPanel/MapBiomassAndLandingsPanel";
import MarketIndicatorsPanel from "./components/MarketIndicatorsPanel/MarketIndicatorsPanel";
import YearRingDock from "./components/YearRingDock/YearRingDock";
import { exampleReport } from "../../../mock-data/outputs/report";
import { useScenarioDashboardState } from "./hooks/useScenarioDashboardState";
import {
  buildDashboardHeaderModel,
  buildMapBiomassAndLandingsPanelModel,
  buildMarketIndicatorsPanelModel,
  buildYearDockModel,
} from "./utils/scenarioPanelModels";
import { buildScenarioSeriesBundle } from "./utils/scenarioSeriesBundle";
import styles from "./components/ScenarioOutputsShared/ScenarioOutputsShared.module.css";

type DemoScenarioOutputsProps = {
  caseId?: SimulationCaseId;
};

const DemoScenarioOutputs = ({
  caseId = "anchovy-bay",
}: DemoScenarioOutputsProps) => {
  const primaryDataset = exampleReport;
  const comparisonDataset = null;
  const title = primaryDataset.title;
  const subtitle = primaryDataset.subtitle;
  const state = useScenarioDashboardState({
    dataset: primaryDataset,
  });
  const seriesBundle = buildScenarioSeriesBundle({
    caseId,
    primaryDataset,
    comparisonDataset,
    state,
  });
  const headerModel = buildDashboardHeaderModel({
    caseId,
    title,
    subtitle,
    primaryDataset,
    comparisonDataset,
    state,
    seriesBundle,
  });
  const primaryPanel = buildMapBiomassAndLandingsPanelModel({
    caseId,
    title,
    subtitle,
    primaryDataset,
    comparisonDataset,
    state,
    seriesBundle,
  });
  const marketPanel = buildMarketIndicatorsPanelModel({
    caseId,
    title,
    subtitle,
    primaryDataset,
    comparisonDataset,
    state,
    seriesBundle,
  });
  const yearDock = buildYearDockModel(state);

  return (
    <div data-case-id={caseId}>
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

export default DemoScenarioOutputs;
