import { z } from "zod";
import { createExperimentPayloadSchema, createExperimentSchemaForOptions, type ExperimentOptions } from "../../../../network/services/experiments/experimentSchemas";

export const SCENARIO_NAME = "northwestern_med";
export type SimulationFormValues = z.input<typeof createExperimentPayloadSchema>;
export type SimulationSubmission = z.output<typeof createExperimentPayloadSchema>;
export type HcrMode = "none" | "custom" | "saved";
export const simulationFormSchema = (options: ExperimentOptions) => createExperimentSchemaForOptions(options)
  .refine(body => body.name.trim().length > 0, { path: ["name"], message: "Enter a simulation name." });

export const speciesLabel = (species: { species_code: string; life_stage?: string; species_name?: string | null }) =>
  `${species.species_name ?? species.species_code} (${species.species_code})${species.life_stage ? ` · ${species.life_stage}` : ""}`;
export const displayDate = (value: string | null) => value ? new Date(value).toLocaleString("en", { timeZone: "UTC" }) + " UTC" : "Unavailable";
