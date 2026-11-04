import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { SimulationCaseId } from "../../data/simulationCases";
import { createScenarioRunFromDraft } from "./mockScenarioRuns";
import type { ScenarioRunInputDraft } from "./types";

const SETUP_LOADING_DURATION_MS = 4800;

type UseScenarioSetupCompletionOptions = {
  caseId: SimulationCaseId;
  onSetupStarted?: () => void;
};

export const useScenarioSetupCompletion = ({
  caseId,
  onSetupStarted,
}: UseScenarioSetupCompletionOptions) => {
  const navigate = useNavigate();
  const [isScenarioSetupLoading, setIsScenarioSetupLoading] = useState(false);
  const loadingTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (loadingTimeoutRef.current !== null) {
        window.clearTimeout(loadingTimeoutRef.current);
      }
    };
  }, []);

  const completeScenarioSetup = (draft: ScenarioRunInputDraft) => {
    createScenarioRunFromDraft(caseId, draft);
    onSetupStarted?.();
    setIsScenarioSetupLoading(true);

    if (loadingTimeoutRef.current !== null) {
      window.clearTimeout(loadingTimeoutRef.current);
    }

    loadingTimeoutRef.current = window.setTimeout(() => {
      navigate(`/scenario-runs/${caseId}`);
      setIsScenarioSetupLoading(false);
      loadingTimeoutRef.current = null;
    }, SETUP_LOADING_DURATION_MS);
  };

  return {
    completeScenarioSetup,
    isScenarioSetupLoading,
  };
};
