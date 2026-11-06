import { useNavigate } from "react-router-dom";
import type { SimulationCaseId } from "../../data/simulationCases";

type UseScenarioSetupCompletionOptions = {
  caseId: SimulationCaseId;
  onSetupStarted?: () => void;
};

// Completing the form only demonstrates navigation. No run is created or saved.
export const useScenarioSetupCompletion = ({
  caseId,
  onSetupStarted,
}: UseScenarioSetupCompletionOptions) => {
  const navigate = useNavigate();
  const completeScenarioSetup = () => {
    onSetupStarted?.();
    navigate(`/scenario-runs/${caseId}`);
  };
  return { completeScenarioSetup };
};
