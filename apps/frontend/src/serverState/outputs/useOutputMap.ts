import { queryOptions, skipToken, useQuery } from "@tanstack/react-query";
import outputService from "../../network/services/outputs/outputService";
import type { OutputMapParams } from "../../network/services/outputs/outputSchemas";
import { useServerSession } from "../useServerSession";
import { outputQueryKeys } from "./outputQueryKeys";

export const outputMapQueryOptions = (userId: string, id: string, params: OutputMapParams | null) => queryOptions({
  queryKey: outputQueryKeys.map(userId, id, params),
  queryFn: params ? ({ signal }) => outputService.map(id, params, signal) : skipToken,
  staleTime: Infinity, gcTime: 5 * 60_000,
});
export const useOutputMap = (id: string, params: OutputMapParams | null, enabled = true) => {
  const session = useServerSession();
  return useQuery({
    ...outputMapQueryOptions(session.userId, id, params), enabled: session.enabled && Boolean(id && params) && enabled,
  });
};
