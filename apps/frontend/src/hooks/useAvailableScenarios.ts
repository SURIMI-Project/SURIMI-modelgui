import { useEffect, useState } from "react";
import { getScenarioNames } from "../lib/services/controller";

/**
 * Scenario names the controller currently offers (GetScenarioNames).
 * `null` while the request is in flight; an empty set if it failed, so callers
 * treat every scenario as unavailable rather than guessing.
 */
export const useAvailableScenarios = () => {
  const [scenarioNames, setScenarioNames] = useState<ReadonlySet<string> | null>(
    null,
  );

  useEffect(() => {
    const controller = new AbortController();

    getScenarioNames(controller.signal)
      .then((names) => {
        setScenarioNames(new Set(names));
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) {
          return;
        }
        console.error("Failed to load scenario names from controller", error);
        setScenarioNames(new Set());
      });

    return () => {
      controller.abort();
    };
  }, []);

  return scenarioNames;
};
