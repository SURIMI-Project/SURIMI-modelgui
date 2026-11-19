import type { ExperimentFilters } from "../../network/services/experiments/experimentSchemas";

export const experimentQueryKeys = {
  all: ["experiments"] as const,
  lists: (userId: string) => ["experiments", userId, "list"] as const,
  list: (userId: string, filters: ExperimentFilters) => ["experiments", userId, "list", filters] as const,
  details: (userId: string) => ["experiments", userId, "detail"] as const,
  detail: (userId: string, id: string) => ["experiments", userId, "detail", id] as const,
};
