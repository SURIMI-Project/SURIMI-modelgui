import { resolveScenarioRunDatasets } from "../../data/resolveScenarioRunDatasets";
import { northwesternMediterraneanRunDatasets } from "./runCatalog";

export const getWesternMediterraneanRunDatasets = (runIds: string[]) => {
  return resolveScenarioRunDatasets(
    "northwestern-mediterranean",
    northwesternMediterraneanRunDatasets,
    runIds,
  );
};
