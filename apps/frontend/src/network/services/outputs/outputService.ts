import request from "../../request";
import { validateRequest } from "../validateRequest";
import { experimentOutputsSchema, outputDownloadUrlSchema, outputFileSchema, outputMapParamsSchema,
  outputMapSchema, outputSeriesParamsSchema, outputSeriesSchema,
  type OutputFile, type OutputMapParams, type OutputSeriesParams } from "./outputSchemas";

const collection = "/experiments/{id}/outputs";
const outputService = {
  metadata: (id: string, signal?: AbortSignal) => request({
    path: collection, pathParams: { id }, method: "GET", responseSchema: experimentOutputsSchema, signal,
  }),
  series: (id: string, params: OutputSeriesParams, signal?: AbortSignal) => request({
    path: `${collection}/series`, pathParams: { id }, method: "GET",
    params: validateRequest(outputSeriesParamsSchema, params), responseSchema: outputSeriesSchema, signal,
  }),
  map: (id: string, params: OutputMapParams, signal?: AbortSignal) => request({
    path: `${collection}/maps`, pathParams: { id }, method: "GET",
    params: { ...validateRequest(outputMapParamsSchema, params), format: "json" }, responseSchema: outputMapSchema, signal,
  }),
  // Return the URL as data only. Never pass an external signed URL to the authenticated transport.
  downloadUrl: (id: string, file: OutputFile = "nc", signal?: AbortSignal) => request({
    path: `${collection}/download-url`, pathParams: { id }, method: "GET",
    params: { file: validateRequest(outputFileSchema, file) }, responseSchema: outputDownloadUrlSchema, signal,
  }),
};
export default outputService;
