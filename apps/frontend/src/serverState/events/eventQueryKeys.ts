export const eventQueryKeys = {
  feed: (userId: string) => ["experimentEvents", userId, "mine"] as const,
};
