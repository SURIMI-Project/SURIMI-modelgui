import { useQuery } from "@tanstack/react-query";
import scenarioService from "../../network/services/scenarios/scenarioService";
import { useCurrentUser } from "../auth/useCurrentUser";
import { scenarioQueryKeys } from "./scenarioQueryKeys";

export const useScenarios = () => {
  const session = useCurrentUser();
  return useQuery({
    queryKey: scenarioQueryKeys.list(session.data?.id ?? "signed-out"),
    queryFn: ({ signal }) => scenarioService.list(signal),
    enabled: Boolean(session.isSuccess && session.data?.is_active && !session.data.must_change_password),
  });
};
