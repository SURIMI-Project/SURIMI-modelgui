import { hcrRulePayloadSchema, speciesEntryKey } from "../../../../network/services/hcrConfigurations/hcrConfigurationSchemas";
import type { HcrRulePayload } from "../../../../network/services/hcrConfigurations/hcrConfigurationSchemas";
import type { ExperimentOptions, InitialHcrData } from "../../../../network/services/scenarios/scenarioSchemas";

export function withInitialHcrData(options: ExperimentOptions, data: InitialHcrData): ExperimentOptions {
  const entries = new Map<string, InitialHcrData["entries"][number]>();
  for (const entry of data.entries) {
    if (entry.length_class || entry.age) continue;
    const key = speciesEntryKey(entry.species_code, entry.life_stage);
    if (!entries.has(key)) entries.set(key, entry);
  }
  return {
    ...options,
    initial_values_available: true,
    species: options.species.map(species => {
      const entry = entries.get(speciesEntryKey(species.species_code, species.life_stage));
      if (!entry) return species;
      return {
        ...species,
        initial_biomass_kg: entry.initial_biomass_kg,
        initial_fishing_mortality: entry.initial_fishing_mortality,
        default_biomass_limit_kg: entry.default_biomass_limit_kg,
        default_biomass_base_kg: entry.default_biomass_base_kg,
        default_f_max: entry.default_f_max,
      };
    }),
  };
}

// Opening and reset values use the same per-species controller defaults.
export function getInitialRule(options: ExperimentOptions, key: string): HcrRulePayload | undefined {
  const species = options.species.find(entry => entry.hcr_eligible && speciesEntryKey(entry.species_code, entry.life_stage) === key);
  if (!species) return undefined;
  return {
    species_code: species.species_code,
    life_stage: species.life_stage,
    biomass_limit_kg: species.default_biomass_limit_kg ?? NaN,
    biomass_base_kg: species.default_biomass_base_kg ?? NaN,
    f_max: species.default_f_max ?? NaN,
  };
}

export function getDefaultRules(options: ExperimentOptions): HcrRulePayload[] {
  return options.species.filter(species => species.hcr_eligible)
    .flatMap(species => {
      const rule = getInitialRule(options, speciesEntryKey(species.species_code, species.life_stage));
      return rule && hcrRulePayloadSchema.safeParse(rule).success ? [rule] : [];
    });
}

export function sameHcrValues(rule: HcrRulePayload, initial: HcrRulePayload | undefined) {
  return Boolean(initial && (["biomass_limit_kg", "biomass_base_kg", "f_max"] as const).every(field => {
    const value = rule[field];
    const baseline = initial[field];
    // Ignore floating-point noise from converting kg to displayed tonnes and back.
    return Number.isFinite(value) && Number.isFinite(baseline) && (Object.is(value, baseline)
      || Math.abs(value - baseline) <= Number.EPSILON * 8 * Math.max(1, Math.abs(value), Math.abs(baseline)));
  }));
}
