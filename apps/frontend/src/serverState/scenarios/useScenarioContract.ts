import { useQuery } from "@tanstack/react-query";
import scenarioService from "../../network/services/scenarios/scenarioService";
import { useCurrentUser } from "../auth/useCurrentUser";
import { scenarioQueryKeys } from "./scenarioQueryKeys";

export const useScenarioContract = (scenarioName: string) => {
  const session = useCurrentUser();
  return useQuery({
    queryKey: scenarioQueryKeys.contract(
      session.data?.id ?? "signed-out",
      scenarioName,
    ),
    queryFn: ({ signal }) => scenarioService.contract(scenarioName, signal),
    enabled: Boolean(
      scenarioName &&
        session.isSuccess &&
        session.data?.is_active &&
        !session.data.must_change_password,
    ),
  });
};
