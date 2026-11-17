import type { SimulationCaseId } from "../../src/data/simulationCases";
import type { ScenarioOutputsDataset } from "../../src/features/ScenarioOutputs/types";
import { createAegeanDemoDatasets } from "./cases/aegean";
import { createAnchovyDemoDatasets } from "./cases/anchovy";
import { createNorthwesternDemoDatasets } from "./cases/northwestern";

const factories = { "aegean-sea": createAegeanDemoDatasets, "anchovy-bay": createAnchovyDemoDatasets,
  "northwestern-mediterranean": createNorthwesternDemoDatasets };
const cache = new Map<SimulationCaseId, Record<string, ScenarioOutputsDataset>>();
export function getDemoRunDataset(caseId: SimulationCaseId, runId: string) {
  if (runId !== "1" && runId !== "2") return undefined;
  let datasets = cache.get(caseId);
  if (!datasets) {
    datasets = factories[caseId]();
    for (const [id, dataset] of Object.entries(datasets)) {
      dataset.title = `Scenario ${id}`;
      dataset.subtitle = "Fixed demonstration data. No experiment has been submitted.";
    }
    cache.set(caseId, datasets);
  }
  return datasets[runId];
}
