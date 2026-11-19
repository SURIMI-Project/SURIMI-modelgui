import { z } from "zod";

// Backend hcr/schemas.py. All wire biomass values are kilograms; no UI conversion here.
export const hcrRulePayloadSchema = z.strictObject({
  species_code: z.string().min(1).max(20).regex(/^[A-Za-z0-9_]+$/),
  life_stage: z.string().max(30).default(""),
  biomass_limit_kg: z.number().positive().max(3.3e12),
  biomass_base_kg: z.number().positive().max(3.3e12),
  f_max: z.number().positive().max(100),
});

export const speciesEntryKey = (code: string, stage: string) =>
  JSON.stringify([code.trim().toUpperCase(), stage.trim().toLowerCase()]);

export const hcrRulesPayloadSchema = z.array(hcrRulePayloadSchema).max(200)
  .superRefine((rules, context) => {
    const entries = new Set<string>();
    rules.forEach((rule, index) => {
      const key = speciesEntryKey(rule.species_code, rule.life_stage);
      if (entries.has(key)) context.addIssue({
        code: "custom", path: [index, "species_code"],
        message: "Only one rule per species and life stage is allowed.",
      });
      entries.add(key);
    });
  });

export const hcrConfigurationPayloadSchema = z.strictObject({
  name: z.string().trim().min(1).max(100),
  rules: hcrRulesPayloadSchema.default([]),
});
const dateTime = z.string().datetime({ offset: true });
export const hcrConfigurationSummarySchema = z.object({
  id: z.uuid(), name: z.string(), rule_count: z.number().int().nonnegative(), updated_at: dateTime,
});
export const hcrConfigurationSchema = z.object({
  id: z.uuid(), scenario_name: z.string(), name: z.string(),
  // Preserve rules that became ineligible; the editor must let the user remove them.
  rules: z.array(z.object({
    species_code: z.string(), life_stage: z.string(), biomass_limit_kg: z.number(),
    biomass_base_kg: z.number(), f_max: z.number(), eligible: z.boolean(),
    species_name: z.string().nullable(), functional_group: z.string().nullable(),
  })),
  created_at: dateTime, updated_at: dateTime,
});
export const hcrConfigurationListSchema = z.object({
  scenario_name: z.string(), configurations: z.array(hcrConfigurationSchema),
});
export type HcrRulePayload = z.input<typeof hcrRulePayloadSchema>;
export type HcrConfigurationPayload = z.input<typeof hcrConfigurationPayloadSchema>;
export type HcrConfiguration = z.output<typeof hcrConfigurationSchema>;
