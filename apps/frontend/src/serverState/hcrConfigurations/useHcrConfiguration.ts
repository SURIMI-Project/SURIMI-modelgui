import { queryOptions, useQuery } from "@tanstack/react-query";
import hcrConfigurationService from "../../network/services/hcrConfigurations/hcrConfigurationService";
import { useServerSession } from "../useServerSession";
import { hcrConfigurationQueryKeys } from "./hcrConfigurationQueryKeys";

export const hcrConfigurationQueryOptions = (userId: string, scenarioName: string, id: string) => queryOptions({
  queryKey: hcrConfigurationQueryKeys.detail(userId, scenarioName, id),
  queryFn: ({ signal }) => hcrConfigurationService.get(scenarioName, id, signal), staleTime: 5 * 60_000,
});
export const useHcrConfiguration = (scenarioName: string, id: string, enabled = true) => {
  const session = useServerSession();
  return useQuery({
    ...hcrConfigurationQueryOptions(session.userId, scenarioName, id),
    enabled: session.enabled && Boolean(scenarioName && id) && enabled,
  });
};
