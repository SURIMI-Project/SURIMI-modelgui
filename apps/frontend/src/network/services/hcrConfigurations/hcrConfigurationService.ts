import { z } from "zod";
import request from "../../request";
import { hcrConfigurationListSchema, hcrConfigurationPayloadSchema, hcrConfigurationSchema,
  type HcrConfigurationPayload } from "./hcrConfigurationSchemas";

const collection = "/scenarios/{scenarioName}/hcr-configurations";
const hcrConfigurationService = {
  list: (scenarioName: string, signal?: AbortSignal) => request({
    path: collection, pathParams: { scenarioName }, method: "GET",
    responseSchema: hcrConfigurationListSchema, signal,
  }),
  get: (scenarioName: string, id: string, signal?: AbortSignal) => request({
    path: `${collection}/{id}`, pathParams: { scenarioName, id }, method: "GET",
    responseSchema: hcrConfigurationSchema, signal,
  }),
  create: (scenarioName: string, payload: HcrConfigurationPayload, signal?: AbortSignal) => request({
    path: collection, pathParams: { scenarioName }, method: "POST",
    payloadSchema: hcrConfigurationPayloadSchema, payload, responseSchema: hcrConfigurationSchema, signal,
  }),
  update: (scenarioName: string, id: string, payload: HcrConfigurationPayload, signal?: AbortSignal) => request({
    path: `${collection}/{id}`, pathParams: { scenarioName, id }, method: "PUT",
    payloadSchema: hcrConfigurationPayloadSchema, payload, responseSchema: hcrConfigurationSchema, signal,
  }),
  remove: (scenarioName: string, id: string, signal?: AbortSignal) => request({
    path: `${collection}/{id}`, pathParams: { scenarioName, id }, method: "DELETE", responseSchema: z.void(), signal,
  }),
};
export default hcrConfigurationService;
