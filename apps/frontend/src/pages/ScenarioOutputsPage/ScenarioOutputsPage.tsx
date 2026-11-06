import { Navigate, useParams } from "react-router-dom";
import { normalizeSimulationCaseId } from "../../data/simulationCases";
import DemoScenarioOutputs from "../../features/ScenarioOutputs/DemoScenarioOutputs";
const ScenarioOutputsPage = () => {
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

  if (!scenarioId) return <Navigate to="/" replace />;

  // Every case deliberately displays the same fixed example report.
  return <DemoScenarioOutputs caseId={scenarioId} />;
};

export default ScenarioOutputsPage;
