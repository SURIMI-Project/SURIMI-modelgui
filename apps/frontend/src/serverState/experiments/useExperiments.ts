import { queryOptions, useQuery } from "@tanstack/react-query";
import experimentService from "../../network/services/experiments/experimentService";
import type { ExperimentFilters } from "../../network/services/experiments/experimentSchemas";
import { useServerSession } from "../useServerSession";
import { experimentQueryKeys } from "./experimentQueryKeys";

export const experimentsQueryOptions = (userId: string, filters: ExperimentFilters = {}) => queryOptions({
  queryKey: experimentQueryKeys.list(userId, filters),
  queryFn: ({ signal }) => experimentService.list(filters, signal),
});
export const useExperiments = (filters: ExperimentFilters = {}, enabled = true) => {
  const session = useServerSession();
  return useQuery({ ...experimentsQueryOptions(session.userId, filters), enabled: session.enabled && enabled });
};
