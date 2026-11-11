import { useLocation, useParams } from "react-router-dom";
import { getSimulationCaseById } from "../../../data/simulationCases";
import { getScenarioWorldConfig } from "../../../constants/scenarioWorldConfig";

type ScenarioWorldRouteState = {
  fromLanding?: boolean;
  action?: "models" | "setup";
};

const useScenarioWorldRoute = () => {
  const location = useLocation();
  const { caseId } = useParams();
  const caseStudy = getSimulationCaseById(caseId);
  const worldConfig = caseStudy ? getScenarioWorldConfig(caseStudy.id) : null;
  const fromLanding = Boolean(
    (location.state as ScenarioWorldRouteState | null)?.fromLanding,
  );

  return {
    caseStudy,
    worldConfig,
    fromLanding,
    initialAction: (location.state as ScenarioWorldRouteState | null)?.action,
  };
};

export default useScenarioWorldRoute;
