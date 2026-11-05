import { useMutation, useQueryClient } from "@tanstack/react-query";
import authService from "../../network/services/auth/authService";
import { authQueryKeys } from "./authQueryKeys";

export const useChangePassword = () => {
  const client = useQueryClient();
  return useMutation({
    mutationFn: authService.changePassword,
    gcTime: 0,
    onSuccess: () => client.invalidateQueries({ queryKey: authQueryKeys.me() }),
  });
};
