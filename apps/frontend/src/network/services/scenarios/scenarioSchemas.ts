import { z } from "zod";

export const scenariosSchema = z.object({
  scenarios: z.array(z.object({ name: z.string() })),
});
export const scenarioContractSchema = z.object({
  scenario_name: z.string(),
  // The backend declares dict[str, Any]; do not pretend nested fields are typed.
  simulation: z.record(z.string(), z.unknown()),
});
export type ScenariosResponse = z.output<typeof scenariosSchema>;
export type ScenarioContract = z.output<typeof scenarioContractSchema>;
