import type { ScenariosResponse } from "../../network/services/scenarios/scenarioSchemas";

export type ScenarioAvailability = "loading" | "error" | "available" | "unavailable";

export const getScenarioAvailability = (
  scenarioName: string,
  response: ScenariosResponse | undefined,
  isError: boolean,
): ScenarioAvailability => {
  if (isError) return "error";
  if (!response) return "loading";
  return response.scenarios.some((scenario) => scenario.name === scenarioName)
    ? "available" : "unavailable";
};
