import { resolveScenarioRunDatasets } from "../../data/resolveScenarioRunDatasets";
import { anchovyBayRunDatasets } from "./runCatalog";

export const getAnchovyBayRunDatasets = (runIds: string[]) => {
  return resolveScenarioRunDatasets(anchovyBayRunDatasets, runIds);
};
