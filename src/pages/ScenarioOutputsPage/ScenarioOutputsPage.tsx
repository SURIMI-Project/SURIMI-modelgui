import { Navigate, useParams, useSearchParams } from "react-router-dom";
import { normalizeSimulationCaseId } from "../../data/simulationCases";
import AnchovyBayOutputs from "../../features/ScenarioOutputs/AnchovyBay/AnchovyBayOutputs";
import AegeanSeaOutputs from "../../features/ScenarioOutputs/AegeanSea/AegeanSeaOutputs";
import WesternMediterraneanOutputs from "../../features/ScenarioOutputs/WesternMediterranean/WesternMediterraneanOutputs";

const scenarioComponentById = {
  "anchovy-bay": AnchovyBayOutputs,
  "aegean-sea": AegeanSeaOutputs,
  "northwestern-mediterranean": WesternMediterraneanOutputs,
} as const;

const ScenarioOutputsPage = () => {
  const [searchParams] = useSearchParams();
  const { scenario, caseId } = useParams<{
    scenario?: string;
    caseId?: string;
  }>();

  const requestedScenarioId = (scenario ?? caseId ?? "").toLowerCase();
  const scenarioId = normalizeSimulationCaseId(requestedScenarioId);

  if (scenario && scenarioId && scenarioId !== requestedScenarioId) {
    return <Navigate to={`/scenario-outputs/${scenarioId}`} replace />;
  }

  if (caseId && scenarioId && scenarioId !== requestedScenarioId) {
    return <Navigate to={`/outputs/${scenarioId}`} replace />;
  }

  const OutputsComponent = scenarioId
    ? scenarioComponentById[scenarioId as keyof typeof scenarioComponentById]
    : null;

  if (!OutputsComponent) {
    return <Navigate to="/" replace />;
  }

  return <OutputsComponent runIds={searchParams.getAll("run")} />;
};

export default ScenarioOutputsPage;
