import { z } from "zod";
import { hcrConfigurationSummarySchema } from "../hcrConfigurations/hcrConfigurationSchemas";

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

// Backend experiments/schemas.py: one response supplies all setup screens.
export const scenarioNameSchema = z.string().min(1).max(100).regex(/^[A-Za-z0-9_-]+$/);
export const experimentOptionsSchema = z.object({
  scenario_name: z.string(),
  start_date_time: z.string().datetime({ offset: true }).nullable(),
  maximum_end_date_time: z.string().datetime({ offset: true }).nullable(),
  climate_scenarios: z.array(z.string()), climate_scenario_required: z.boolean(),
  pods_single_run: z.number().int().positive(), pods_mse_run: z.number().int().positive(),
  species: z.array(z.object({
    species_code: z.string(), life_stage: z.string(), hcr_eligible: z.boolean(),
    species_name: z.string().nullable(), scientific_name: z.string().nullable(),
    functional_group: z.string().nullable(), functional_group_name: z.string().nullable(),
    // Reference values only. The controller's biomass unit is not yet confirmed.
    initial_biomass: z.number().nullable(), initial_fishing_mortality: z.number().nullable(),
  })),
  hcr_configurations: z.array(hcrConfigurationSummarySchema),
  initial_values_available: z.boolean(), notes: z.array(z.string()),
});
export type ExperimentOptions = z.output<typeof experimentOptionsSchema>;
