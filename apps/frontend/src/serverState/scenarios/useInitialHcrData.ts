import { queryOptions, useQuery } from "@tanstack/react-query";
import scenarioService from "../../network/services/scenarios/scenarioService";
import { useServerSession } from "../useServerSession";
import { scenarioQueryKeys } from "./scenarioQueryKeys";

export const initialHcrDataQueryOptions = (userId: string, scenarioName: string) => queryOptions({
  queryKey: scenarioQueryKeys.initialHcrData(userId, scenarioName),
  queryFn: ({ signal }) => scenarioService.initialHcrData(scenarioName, signal),
  staleTime: 5 * 60_000,
});

export const useInitialHcrData = (scenarioName: string, enabled = true) => {
  const session = useServerSession();
  return useQuery({
    ...initialHcrDataQueryOptions(session.userId, scenarioName),
    enabled: session.enabled && Boolean(scenarioName) && enabled,
  });
};
