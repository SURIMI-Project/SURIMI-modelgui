import request from "../../request";
import { validateRequest } from "../validateRequest";
import { createExperimentPayloadSchema, createExperimentSchemaForOptions, experimentDetailSchema,
  experimentFiltersSchema, experimentPageSchema, experimentSchema,
  type CreateExperimentPayload, type ExperimentFilters, type ExperimentOptions } from "./experimentSchemas";

const experimentService = {
  list: (filters: ExperimentFilters = {}, signal?: AbortSignal) => request({
    path: "/experiments", method: "GET", params: validateRequest(experimentFiltersSchema, filters),
    responseSchema: experimentPageSchema, signal,
  }),
  get: (experimentId: string, signal?: AbortSignal) => request({
    path: "/experiments/{id}", pathParams: { id: experimentId }, method: "GET",
    responseSchema: experimentDetailSchema, signal,
  }),
  create: (payload: CreateExperimentPayload, options: ExperimentOptions, signal?: AbortSignal) => request({
    path: "/experiments", method: "POST", responseSchema: experimentSchema,
    payloadSchema: createExperimentPayloadSchema,
    payload: validateRequest(createExperimentSchemaForOptions(options), payload), signal,
  }),
};
export default experimentService;
