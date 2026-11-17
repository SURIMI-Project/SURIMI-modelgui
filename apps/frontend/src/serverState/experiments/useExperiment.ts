import { queryOptions, useQuery } from "@tanstack/react-query";
import experimentService from "../../network/services/experiments/experimentService";
import { useServerSession } from "../useServerSession";
import { experimentQueryKeys } from "./experimentQueryKeys";

export const experimentQueryOptions = (userId: string, id: string) => queryOptions({
  queryKey: experimentQueryKeys.detail(userId, id),
  queryFn: ({ signal }) => experimentService.get(id, signal),
});
export const useExperiment = (id: string, enabled = true) => {
  const session = useServerSession();
  return useQuery({ ...experimentQueryOptions(session.userId, id), enabled: session.enabled && Boolean(id) && enabled });
};
