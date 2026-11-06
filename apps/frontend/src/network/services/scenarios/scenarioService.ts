import request from "../../request";
import { scenarioContractSchema, scenariosSchema } from "./scenarioSchemas";

const scenarioService = {
  list: (signal?: AbortSignal) => request({
    path: "/scenarios", method: "GET", responseSchema: scenariosSchema, signal,
  }),
  contract: (scenarioName: string, signal?: AbortSignal) => request({
    path: "/scenarios/{scenarioName}/contract", method: "GET",
    pathParams: { scenarioName }, responseSchema: scenarioContractSchema, signal,
  }),
};
export default scenarioService;
