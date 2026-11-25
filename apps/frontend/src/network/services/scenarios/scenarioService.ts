import request from "../../request";
import { experimentOptionsSchema, initialHcrDataSchema, scenarioContractSchema, scenariosSchema } from "./scenarioSchemas";

const scenarioService = {
  list: (signal?: AbortSignal) => request({
    path: "/scenarios", method: "GET", responseSchema: scenariosSchema, signal,
  }),
  experimentOptions: (scenarioName: string, signal?: AbortSignal) => request({
    path: "/scenarios/{scenarioName}/experiment-options", method: "GET",
    pathParams: { scenarioName }, responseSchema: experimentOptionsSchema, signal,
  }),
  initialHcrData: (scenarioName: string, signal?: AbortSignal) => request({
    path: "/scenarios/{scenarioName}/initial-hcr-data", method: "GET",
    pathParams: { scenarioName },
    responseSchema: initialHcrDataSchema.refine(data => data.scenario_name === scenarioName, { message: "Default values belong to a different scenario." }),
    signal,
  }),
  contract: (scenarioName: string, signal?: AbortSignal) => request({
    path: "/scenarios/{scenarioName}/contract", method: "GET",
    pathParams: { scenarioName }, responseSchema: scenarioContractSchema, signal,
  }),
};
export default scenarioService;
