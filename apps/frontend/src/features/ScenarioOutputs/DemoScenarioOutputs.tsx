import type { SimulationCaseId } from "../../data/simulationCases";
import ScenarioOutputsView from "./ScenarioOutputsView";
import { exampleReport } from "../../../mock-data/outputs/report";
import { useScenarioDashboardState } from "./hooks/useScenarioDashboardState";
import {
  buildDashboardHeaderModel,
  buildMapBiomassAndLandingsPanelModel,
  buildMarketIndicatorsPanelModel,
  buildYearDockModel,
} from "./utils/scenarioPanelModels";
import { buildScenarioSeriesBundle } from "./utils/scenarioSeriesBundle";

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

  return <ScenarioOutputsView header={headerModel} primaryPanel={primaryPanel}
    marketPanel={marketPanel} yearDock={yearDock}
    backHref={`/scenario-runs?case=${caseId}`} isDemonstration />;

};

export default DemoScenarioOutputs;
