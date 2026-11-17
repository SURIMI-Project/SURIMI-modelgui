import { z } from "zod";
import { hcrRulesPayloadSchema, speciesEntryKey } from "../hcrConfigurations/hcrConfigurationSchemas";
import { scenarioNameSchema, type ExperimentOptions } from "../scenarios/scenarioSchemas";
import { experimentEventSchema } from "../events/eventSchemas";

const dateTime = z.string().datetime({ offset: true });
export const experimentStatusSchema = z.enum([
  "queued", "submitting", "submit_failed", "submitted", "initialising", "initialised",
  "running", "copying_results", "completed", "failed", "cancelling", "cancelled",
]);
export const simulationStateSchema = z.enum([
  "initialising", "initialised", "running", "finished", "failed", "cancelled", "unknown",
]);
export const createExperimentPayloadSchema = z.strictObject({
  name: z.string().min(1).max(200),
  scenario_name: scenarioNameSchema,
  end_date_time: dateTime,
  is_mse_run: z.boolean().default(false),
  climate_scenario: z.string().nullable().optional(),
  harvest_control_rules: hcrRulesPayloadSchema.nullable().optional(),
  hcr_configuration_id: z.uuid().nullable().optional(),
}).refine((body) => body.harvest_control_rules == null || body.hcr_configuration_id == null, {
  path: ["hcr_configuration_id"], message: "Send saved configuration ID or inline rules, never both.",
});

// The static wire schema cannot know a case's current capabilities. Use this
// schema in the create mutation with the options that populated the form.
export const createExperimentSchemaForOptions = (options: ExperimentOptions) =>
  createExperimentPayloadSchema.superRefine((body, context) => {
    const issue = (path: (string | number)[], message: string) =>
      context.addIssue({ code: "custom", path, message });
    if (body.scenario_name !== options.scenario_name)
      issue(["scenario_name"], "Options belong to a different case.");
    const end = Date.parse(body.end_date_time);
    if (!options.start_date_time || !options.maximum_end_date_time) {
      issue(["end_date_time"], "Case date limits are unavailable.");
    } else if (end <= Date.parse(options.start_date_time) || end > Date.parse(options.maximum_end_date_time)) {
      issue(["end_date_time"], "End date must be after the start and within the case date limits.");
    }
    if (options.climate_scenarios.length > 0) {
      if (!body.climate_scenario || !options.climate_scenarios.includes(body.climate_scenario))
        issue(["climate_scenario"], "Select a climate scenario supported by this case.");
    } else if (body.climate_scenario) {
      issue(["climate_scenario"], "This case does not accept a climate scenario.");
    }
    const eligible = new Set(options.species.filter((s) => s.hcr_eligible)
      .map((s) => speciesEntryKey(s.species_code, s.life_stage)));
    body.harvest_control_rules?.forEach((rule, index) => {
      if (!eligible.has(speciesEntryKey(rule.species_code, rule.life_stage)))
        issue(["harvest_control_rules", index, "species_code"], "This entry cannot carry an HCR.");
    });
    if (body.hcr_configuration_id && !options.hcr_configurations.some((c) => c.id === body.hcr_configuration_id))
      issue(["hcr_configuration_id"], "Select one of this case's saved configurations.");
  });

export const experimentSchema = z.object({
  id: z.uuid(), name: z.string(), scenario_name: z.string(), owner_id: z.uuid(),
  owner_username: z.string().nullable().optional(), status: experimentStatusSchema,
  controller_status_raw: z.string().nullable(), is_mse_run: z.boolean(), pods_required: z.number().int(),
  simulation_counts: z.record(z.string(), z.number().int().nonnegative()).default({}),
  priority: z.number().int(), queue_position: z.number().int().nullable().optional(),
  estimated_start_at: dateTime.nullable().optional(), progress: z.number().min(0).max(1).nullable(),
  stalled: z.boolean(), stalled_reason: z.string().nullable(), error: z.string().nullable(),
  end_date_time: z.string().nullable(), climate_scenario: z.string().nullable(),
  outputs_state: z.string().nullable().optional(), cloned_from_id: z.uuid().nullable(),
  created_at: dateTime, queued_at: dateTime, submitted_at: dateTime.nullable(),
  started_at: dateTime.nullable(), finished_at: dateTime.nullable(),
  completed_at: dateTime.nullable(), cancel_requested_at: dateTime.nullable(),
});
export const experimentDetailSchema = experimentSchema.extend({
  // Backend declares stored request as dict[str, Any]; do not guess a nested type.
  request: z.record(z.string(), z.unknown()), protocol_version: z.string(),
  simulations: z.array(z.object({
    id: z.uuid(), order: z.number().int(), status: simulationStateSchema, status_raw: z.string(),
    progress: z.number().min(0).max(1), start_date_time: dateTime.nullable(), end_date_time: dateTime.nullable(),
    simulation_current: dateTime.nullable(), simulation_started: dateTime.nullable(),
    duration: z.string().nullable(), ecology_host: z.string().nullable(), status_since: dateTime,
  })),
  events: z.array(experimentEventSchema),
});
export const experimentPageSchema = z.object({
  items: z.array(experimentSchema), total: z.number().int().nonnegative(),
  page: z.number().int().positive(), size: z.number().int().positive(),
});
export const experimentFiltersSchema = z.strictObject({
  scenario: z.string().max(100).optional(), status: experimentStatusSchema.optional(),
  owner_id: z.uuid().optional(), q: z.string().max(100).optional(),
  submitted_from: dateTime.optional(), submitted_to: dateTime.optional(),
  page: z.number().int().positive().default(1), size: z.number().int().min(1).max(200).default(50),
  sort: z.enum(["created_at", "-created_at", "name", "-name", "status", "-status"]).default("-created_at"),
});
export type CreateExperimentPayload = z.input<typeof createExperimentPayloadSchema>;
export type { ExperimentOptions } from "../scenarios/scenarioSchemas";
export type Experiment = z.output<typeof experimentSchema>;
export type ExperimentDetail = z.output<typeof experimentDetailSchema>;
export type ExperimentFilters = z.input<typeof experimentFiltersSchema>;
export type ExperimentPage = z.output<typeof experimentPageSchema>;
