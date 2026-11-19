import type { OutputMapParams, OutputSeriesParams } from "../../network/services/outputs/outputSchemas";

export const outputQueryKeys = {
  all: ["outputs"] as const,
  user: (userId: string) => ["outputs", userId] as const,
  experiment: (userId: string, id: string) => ["outputs", userId, id] as const,
  metadata: (userId: string, id: string) => ["outputs", userId, id, "metadata"] as const,
  series: (userId: string, id: string, params: OutputSeriesParams | null) =>
    ["outputs", userId, id, "series", params] as const,
  map: (userId: string, id: string, params: OutputMapParams | null) =>
    ["outputs", userId, id, "map", params] as const,
};
