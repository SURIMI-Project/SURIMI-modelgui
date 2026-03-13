import { Navigate, useParams } from "react-router-dom";
import AnchovyBayOutputs from "../../features/ScenarioOutputs/AnchovyBay/AnchovyBayOutputs";
import AegeanSeaOutputs from "../../features/ScenarioOutputs/AegeanSea/AegeanSeaOutputs";
import WesternMediterraneanOutputs from "../../features/ScenarioOutputs/WesternMediterranean/WesternMediterraneanOutputs";

const scenarioComponentById = {
  "anchovy-bay": AnchovyBayOutputs,
  "aegean-sea": AegeanSeaOutputs,
  "western-mediterranean": WesternMediterraneanOutputs,
} as const;

const ScenarioOutputsPage = () => {
  const { scenario, caseId } = useParams<{
    scenario?: string;
    caseId?: string;
  }>();

  const scenarioId = (scenario ?? caseId ?? "").toLowerCase();
  const OutputsComponent =
    scenarioComponentById[scenarioId as keyof typeof scenarioComponentById];

  if (!OutputsComponent) {
    return <Navigate to="/" replace />;
  }

  return <OutputsComponent />;
};

export default ScenarioOutputsPage;
