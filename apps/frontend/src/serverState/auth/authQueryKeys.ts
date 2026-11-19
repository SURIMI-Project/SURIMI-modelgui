export const authQueryKeys = {
  all: ["auth"] as const,
  me: () => ["auth", "me"] as const,
  providers: () => ["auth", "providers"] as const,
};
