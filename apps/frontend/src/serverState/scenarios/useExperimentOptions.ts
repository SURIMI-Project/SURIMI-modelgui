import { queryOptions, useQuery } from "@tanstack/react-query";
import scenarioService from "../../network/services/scenarios/scenarioService";
import { useServerSession } from "../useServerSession";
import { scenarioQueryKeys } from "./scenarioQueryKeys";

export const experimentOptionsQueryOptions = (userId: string, scenarioName: string) => queryOptions({
  queryKey: scenarioQueryKeys.experimentOptions(userId, scenarioName),
  queryFn: ({ signal }) => scenarioService.experimentOptions(scenarioName, signal),
  staleTime: 5 * 60_000,
});
// Call only when setup is open, or pass enabled=false until it is opened.
export const useExperimentOptions = (scenarioName: string, enabled = true) => {
  const session = useServerSession();
  return useQuery({
    ...experimentOptionsQueryOptions(session.userId, scenarioName),
    enabled: session.enabled && Boolean(scenarioName) && enabled,
  });
};
