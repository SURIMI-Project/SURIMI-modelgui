import type { SimulationCaseId } from "../../../data/simulationCases";
import { getScenarioRunById } from "../../ScenarioRuns/mockScenarioRuns";
import type { ScenarioOutputsDataset } from "../types";
import { scaleMockScenarioDataset } from "./scaleMockScenarioDataset";

export const resolveScenarioRunDatasets = (
  caseId: SimulationCaseId,
  runCatalog: Record<string, ScenarioOutputsDataset>,
  runIds: string[],
): ScenarioOutputsDataset[] => {
  const resolvedRunIds =
    runIds.length > 0 ? runIds.slice(0, 2) : Object.keys(runCatalog).slice(0, 1);

  return resolvedRunIds
    .map((runId) => {
      const explicitDataset = runCatalog[runId];
      if (explicitDataset) {
        return explicitDataset;
      }

      const fallbackDataset = Object.values(runCatalog)[0];
      if (!fallbackDataset) {
        return null;
      }

      const run = getScenarioRunById(caseId, runId);
      return scaleMockScenarioDataset(
        fallbackDataset,
        runId,
        run?.title ?? fallbackDataset.title,
      );
    })
    .filter((dataset): dataset is ScenarioOutputsDataset => dataset !== null);
};
