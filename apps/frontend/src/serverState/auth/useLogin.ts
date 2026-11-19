import { useMutation, useQueryClient } from "@tanstack/react-query";
import authService from "../../network/services/auth/authService";
import { replaceSession } from "./sessionCache";

export const useLogin = () => {
  const client = useQueryClient();
  return useMutation({
    mutationFn: authService.login,
    gcTime: 0,
    onSuccess: (user) => replaceSession(client, user),
  });
};
