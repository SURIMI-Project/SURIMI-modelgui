import { resolveScenarioRunDatasets } from "../../data/resolveScenarioRunDatasets";
import { aegeanSeaRunDatasets } from "./runCatalog";

export const getAegeanSeaRunDatasets = (runIds: string[]) => {
  return resolveScenarioRunDatasets(aegeanSeaRunDatasets, runIds);
};
