import { resolveScenarioRunDatasets } from "../../data/resolveScenarioRunDatasets";
import { aegeanSeaRunDatasets } from "./runCatalog";

export const getAegeanSeaRunDatasets = (runIds: string[]) => {
  return resolveScenarioRunDatasets("aegean-sea", aegeanSeaRunDatasets, runIds);
};
