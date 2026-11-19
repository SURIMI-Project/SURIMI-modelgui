import { MutationCache, QueryCache, QueryClient } from "@tanstack/react-query";
import { AppError } from "../network/errors/appError";
import { expireSession } from "./auth/sessionCache";

export const createQueryClient = () => {
  const onError = (error: Error) => {
    if (error instanceof AppError && error.kind === "unauthorized"
      && error.code !== "invalid_credentials") expireSession(client);
  };
  const client = new QueryClient({
    queryCache: new QueryCache({ onError }),
    mutationCache: new MutationCache({ onError }),
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        // Auth refresh/retry belongs to the transport. Do not replay 401s or writes here.
        retry: false,
      },
      mutations: { retry: false },
    },
  });
  return client;
};
export const queryClient = createQueryClient();
