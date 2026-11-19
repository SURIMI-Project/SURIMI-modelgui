import { useQuery } from "@tanstack/react-query";
import authService from "../../network/services/auth/authService";
import { authQueryKeys } from "./authQueryKeys";

export const useAuthProviders = () => useQuery({
  queryKey: authQueryKeys.providers(),
  queryFn: ({ signal }) => authService.providers(signal),
  staleTime: 5 * 60_000,
});
