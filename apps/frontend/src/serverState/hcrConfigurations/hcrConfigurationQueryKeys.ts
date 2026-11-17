export const hcrConfigurationQueryKeys = {
  all: ["hcrConfigurations"] as const,
  scenario: (userId: string, scenarioName: string) => ["hcrConfigurations", userId, scenarioName] as const,
  list: (userId: string, scenarioName: string) => ["hcrConfigurations", userId, scenarioName, "list"] as const,
  detail: (userId: string, scenarioName: string, id: string) =>
    ["hcrConfigurations", userId, scenarioName, "detail", id] as const,
};
