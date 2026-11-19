import { queryOptions, useQuery } from "@tanstack/react-query";
import outputService from "../../network/services/outputs/outputService";
import { useServerSession } from "../useServerSession";
import { outputQueryKeys } from "./outputQueryKeys";

export const experimentOutputsQueryOptions = (userId: string, id: string) => queryOptions({
  queryKey: outputQueryKeys.metadata(userId, id),
  queryFn: ({ signal }) => outputService.metadata(id, signal),
});
export const useExperimentOutputs = (id: string, enabled = true) => {
  const session = useServerSession();
  return useQuery({
    ...experimentOutputsQueryOptions(session.userId, id), enabled: session.enabled && Boolean(id) && enabled,
  });
};
