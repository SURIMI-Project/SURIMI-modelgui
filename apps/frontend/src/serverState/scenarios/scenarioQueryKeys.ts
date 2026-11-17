export const scenarioQueryKeys = {
  all: ["scenarios"] as const,
  list: (userId: string) => ["scenarios", userId, "list"] as const,
  experimentOptions: (userId: string, name: string) =>
    ["scenarios", userId, "experimentOptions", name] as const,
  contract: (userId: string, name: string) =>
    ["scenarios", userId, "contract", name] as const,
};
