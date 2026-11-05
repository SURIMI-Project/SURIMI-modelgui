import type { QueryClient } from "@tanstack/react-query";
import type { User } from "../../network/services/auth/authSchemas";
import { authQueryKeys } from "./authQueryKeys";

export const replaceSession = async (client: QueryClient, user: User | null) => {
  await client.cancelQueries();
  // Keep the observed /me query so mounted route guards receive the identity change.
  client.removeQueries({
    predicate: (query) => !(query.queryKey.length === 2
      && query.queryKey[0] === "auth" && query.queryKey[1] === "me"),
  });
  client.setQueryData(authQueryKeys.me(), user);
};

export const clearProtectedQueries = (client: QueryClient) => {
  // Cancel before removing so old requests cannot repopulate another user's data.
  void client.cancelQueries({ predicate: (query) => query.queryKey[0] !== "auth" });
  client.removeQueries({ predicate: (query) => query.queryKey[0] !== "auth" });
};

export const expireSession = (client: QueryClient) => {
  // A late /me response must not revive a session that another request found ended.
  void client.cancelQueries({ queryKey: authQueryKeys.me(), exact: true });
  clearProtectedQueries(client);
  client.setQueryData(authQueryKeys.me(), null);
};
