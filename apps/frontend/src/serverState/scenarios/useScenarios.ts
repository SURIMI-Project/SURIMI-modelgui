import { useQuery } from "@tanstack/react-query";
import { useCurrentUser } from "../auth/useCurrentUser";
import { scenarioListOptions } from "./scenarioListOptions";

export const useScenarios = () => {
  const session = useCurrentUser();
  return useQuery({
    ...scenarioListOptions(session.data?.id ?? "signed-out"),
    enabled: Boolean(
      session.isSuccess &&
        session.data?.is_active &&
        !session.data.must_change_password,
    ),
  });
};
