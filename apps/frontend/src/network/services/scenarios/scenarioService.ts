import request from "../../request";
import { experimentOptionsSchema, scenarioContractSchema, scenariosSchema } from "./scenarioSchemas";

const scenarioService = {
  list: (signal?: AbortSignal) => request({
    path: "/scenarios", method: "GET", responseSchema: scenariosSchema, signal,
  }),
  experimentOptions: (scenarioName: string, signal?: AbortSignal) => request({
    path: "/scenarios/{scenarioName}/experiment-options", method: "GET",
    pathParams: { scenarioName }, responseSchema: experimentOptionsSchema, signal,
  }),
  contract: (scenarioName: string, signal?: AbortSignal) => request({
    path: "/scenarios/{scenarioName}/contract", method: "GET",
    pathParams: { scenarioName }, responseSchema: scenarioContractSchema, signal,
  }),
};
export default scenarioService;
