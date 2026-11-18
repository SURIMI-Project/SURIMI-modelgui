import { defaultConfigureRules } from "../../../../../mock-data/defaultConfigureRules";
import { hcrRulesPayloadSchema, speciesEntryKey } from "../../../../network/services/hcrConfigurations/hcrConfigurationSchemas";
import type { HcrRulePayload } from "../../../../network/services/hcrConfigurations/hcrConfigurationSchemas";
import type { ExperimentOptions } from "../../../../network/services/scenarios/scenarioSchemas";

export function getDevelopmentRules(options: ExperimentOptions) {
  if (!import.meta.env.DEV || import.meta.env.VITE_MOCK_HCR_DEFAULTS === "false" || options.scenario_name !== "northwestern_med") return [];
  const eligible = new Set(options.species.filter(species => species.hcr_eligible)
    .map(species => speciesEntryKey(species.species_code, species.life_stage)));
  return hcrRulesPayloadSchema.parse(defaultConfigureRules.northwestern_med
    .filter(rule => eligible.has(speciesEntryKey(rule.species_code, rule.life_stage)))
    .map(rule => ({ ...rule })));
}

// Restore the available opening values; never infer thresholds from controller biomass.
export function getInitialRule(options: ExperimentOptions, key: string): HcrRulePayload | undefined {
  const species = options.species.find(entry => entry.hcr_eligible && speciesEntryKey(entry.species_code, entry.life_stage) === key);
  if (!species) return undefined;
  return getDevelopmentRules(options).find(rule => speciesEntryKey(rule.species_code, rule.life_stage) === key)
    ?? { species_code: species.species_code, life_stage: species.life_stage, biomass_limit_kg: NaN, biomass_base_kg: NaN, f_max: NaN };
}
