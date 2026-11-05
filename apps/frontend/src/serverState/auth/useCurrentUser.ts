import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AppError } from "../../network/errors/appError";
import authService from "../../network/services/auth/authService";
import { authQueryKeys } from "./authQueryKeys";
import { clearProtectedQueries } from "./sessionCache";

export const useCurrentUser = () => {
  const client = useQueryClient();
  return useQuery({
    queryKey: authQueryKeys.me(),
    queryFn: async ({ signal }) => {
      try {
        return await authService.me(signal);
      } catch (error) {
        // A failed refresh with 401 means signed out; other failures stay visible.
        if (error instanceof AppError && error.kind === "unauthorized") {
          clearProtectedQueries(client);
          return null;
        }
        throw error;
      }
    },
  });
};
