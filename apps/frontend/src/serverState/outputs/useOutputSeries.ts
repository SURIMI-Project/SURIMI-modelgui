import { queryOptions, skipToken, useQuery } from "@tanstack/react-query";
import outputService from "../../network/services/outputs/outputService";
import type { OutputSeriesParams } from "../../network/services/outputs/outputSchemas";
import { useServerSession } from "../useServerSession";
import { outputQueryKeys } from "./outputQueryKeys";

export const outputSeriesQueryOptions = (userId: string, id: string, params: OutputSeriesParams | null) => queryOptions({
  queryKey: outputQueryKeys.series(userId, id, params),
  queryFn: params ? ({ signal }) => outputService.series(id, params, signal) : skipToken,
  staleTime: Infinity, gcTime: 30 * 60_000,
});
// Pass null until metadata is ready and the desired filters are known.
export const useOutputSeries = (id: string, params: OutputSeriesParams | null, enabled = true) => {
  const session = useServerSession();
  return useQuery({
    ...outputSeriesQueryOptions(session.userId, id, params),
    enabled: session.enabled && Boolean(id && params) && enabled,
  });
};
