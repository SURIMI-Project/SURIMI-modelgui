import { defaultConfigureRules } from "../../../../../mock-data/defaultConfigureRules";
import { hcrRulesPayloadSchema, speciesEntryKey } from "../../../../network/services/hcrConfigurations/hcrConfigurationSchemas";
import type { ExperimentOptions } from "../../../../network/services/scenarios/scenarioSchemas";

export function getDevelopmentRules(options: ExperimentOptions) {
  if (!import.meta.env.DEV || import.meta.env.VITE_MOCK_HCR_DEFAULTS === "false" || options.scenario_name !== "northwestern_med") return [];
  const eligible = new Set(options.species.filter(species => species.hcr_eligible)
    .map(species => speciesEntryKey(species.species_code, species.life_stage)));
  return hcrRulesPayloadSchema.parse(defaultConfigureRules.northwestern_med
    .filter(rule => eligible.has(speciesEntryKey(rule.species_code, rule.life_stage)))
    .map(rule => ({ ...rule })));
}
