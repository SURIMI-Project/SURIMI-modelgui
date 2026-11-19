import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AppError } from "../../network/errors/appError";
import authService from "../../network/services/auth/authService";
import { replaceSession } from "./sessionCache";

export const useLogout = () => {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      try {
        await authService.logout();
      } catch (error) {
        // An already-ended server session is also locally signed out.
        if (!(error instanceof AppError && error.kind === "unauthorized")) throw error;
      }
    },
    gcTime: 0,
    onSuccess: () => replaceSession(client, null),
  });
};
