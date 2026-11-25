import { MAX_HCR_BIOMASS_KG, MAX_HCR_BIOMASS_TONNES, MAX_HCR_FISHING_MORTALITY } from "../../components/HarvestControlInputs/limits";
import { z } from "zod";
import { createExperimentPayloadSchema, createExperimentSchemaForOptions, type ExperimentOptions } from "../../../../network/services/experiments/experimentSchemas";

export const SCENARIO_NAME = "northwestern_med";
export type SimulationFormValues = z.input<typeof createExperimentPayloadSchema>;
export type SimulationSubmission = z.output<typeof createExperimentPayloadSchema>;
export type HcrMode = "none" | "custom" | "saved";
export const simulationFormSchema = (options: ExperimentOptions) => createExperimentSchemaForOptions(options)
  .refine(body => body.name.trim().length > 0, { path: ["name"], message: "Enter a simulation name." })
  .refine(body => body.name.length <= 24, { path: ["name"], message: "Use no more than 24 characters." })
  .superRefine((body, context) => {
    body.harvest_control_rules?.forEach((rule, index) => {
      if (rule.f_max > MAX_HCR_FISHING_MORTALITY) context.addIssue({ code: "custom", path: ["harvest_control_rules", index, "f_max"], message: `Maximum ${MAX_HCR_FISHING_MORTALITY} per year.` });
      for (const field of ["biomass_limit_kg", "biomass_base_kg"] as const) {
        if (rule[field] > MAX_HCR_BIOMASS_KG) context.addIssue({ code: "custom", path: ["harvest_control_rules", index, field], message: `Maximum ${MAX_HCR_BIOMASS_TONNES.toLocaleString("en")} tonnes.` });
      }
    });
  });

export const speciesLabel = (species: { species_code: string; life_stage?: string; species_name?: string | null }) =>
  `${species.species_name ?? species.species_code} (${species.species_code})${species.life_stage ? ` · ${species.life_stage}` : ""}`;
export const displayDate = (value: string | null) => value ? new Date(value).toLocaleString("en", { timeZone: "UTC" }) + " UTC" : "Unavailable";

export function getRunDurations(options: Pick<ExperimentOptions, "start_date_time" | "maximum_end_date_time">) {
  const start = options.start_date_time ? new Date(options.start_date_time) : null;
  const maximum = options.maximum_end_date_time ? new Date(options.maximum_end_date_time) : null;
  if (!start || !maximum || !Number.isFinite(start.getTime()) || !Number.isFinite(maximum.getTime())) return [];
  const candidate = (years: number) => {
    const end = new Date(start);
    end.setUTCFullYear(start.getUTCFullYear() + years);
    if (end.getUTCMonth() !== start.getUTCMonth()) end.setUTCDate(0);
    return { years, end: end.toISOString(), allowed: end > start && end <= maximum };
  };
  return [5, 10, 30, 50].map(candidate);
}
