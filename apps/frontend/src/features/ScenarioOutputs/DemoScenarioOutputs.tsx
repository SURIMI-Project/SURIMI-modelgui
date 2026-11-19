import { scenarioWorldContent } from "../../../mock-data/content/caseIntroductions";
import type { SimulationCaseId } from "../../data/simulationCases";
import ScenarioOutputsView from "./ScenarioOutputsView";
import type { ScenarioOutputsDataset } from "./types";
import { useScenarioDashboardState } from "./hooks/useScenarioDashboardState";
import {
  buildDashboardHeaderModel,
  buildMapBiomassAndLandingsPanelModel,
  buildMarketIndicatorsPanelModel,
  buildYearDockModel,
} from "./utils/scenarioPanelModels";
import { buildScenarioSeriesBundle } from "./utils/scenarioSeriesBundle";

type DemoScenarioOutputsProps = {
  caseId: SimulationCaseId;
  primaryDataset: ScenarioOutputsDataset;
  comparisonDataset: ScenarioOutputsDataset | null;
};

const DemoScenarioOutputs = ({
  caseId, primaryDataset, comparisonDataset,
}: DemoScenarioOutputsProps) => {
  const runTitle = comparisonDataset ? `${primaryDataset.title} vs ${comparisonDataset.title}` : primaryDataset.title;
  const title = `${scenarioWorldContent[caseId].worldTitle} · ${runTitle}`;
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
