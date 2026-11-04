import type { ScenarioOutputsDataset } from "../types";
import { scaleMockScenarioDataset } from "./scaleMockScenarioDataset";

export const resolveScenarioRunDatasets = (
  runCatalog: Record<string, ScenarioOutputsDataset>,
  runIds: string[],
): ScenarioOutputsDataset[] => {
  const resolvedRunIds =
    runIds.length > 0
      ? runIds.slice(0, 2)
      : Object.keys(runCatalog).slice(0, 1);

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

      return scaleMockScenarioDataset(
        fallbackDataset,
        runId,
        fallbackDataset.title,
      );
    })
    .filter((dataset): dataset is ScenarioOutputsDataset => dataset !== null);
};
