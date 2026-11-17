import type { QueryClient } from "@tanstack/react-query";
import type { User } from "../network/services/auth/authSchemas";
import { AppError } from "../network/errors/appError";
import { authQueryKeys } from "./auth/authQueryKeys";
import { useCurrentUser } from "./auth/useCurrentUser";

export const isCurrentSession = (client: QueryClient, userId: string) => {
  const user = client.getQueryData<User | null>(authQueryKeys.me());
  return Boolean(userId && user?.id === userId && user.is_active && !user.must_change_password);
};
export const requireCurrentSession = (client: QueryClient, userId: string) => {
  if (!isCurrentSession(client, userId)) throw new AppError({
    kind: "forbidden", code: "session_changed", message: "An active, unchanged session is required.",
  });
};
export const useServerSession = () => {
  const session = useCurrentUser();
  const enabled = Boolean(session.isSuccess && session.data?.is_active && !session.data.must_change_password);
  return { userId: session.data?.id ?? "signed-out", enabled };
};
