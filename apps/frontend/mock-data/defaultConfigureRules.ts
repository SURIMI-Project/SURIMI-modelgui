import type { HcrRulePayload } from "../src/network/services/hcrConfigurations/hcrConfigurationSchemas";

// Local development examples only. These are not approved scientific defaults.
// Values are explicitly in kg; none are calculated from controller reference biomass.
export const defaultConfigureRules = {
  northwestern_med: [
    { species_code: "BOG", life_stage: "", biomass_limit_kg: 1000000, biomass_base_kg: 4000000, f_max: 0.2 },
    { species_code: "HKE", life_stage: "adult", biomass_limit_kg: 4000000, biomass_base_kg: 10000000, f_max: 0.3 },
    { species_code: "HKE", life_stage: "juvenile", biomass_limit_kg: 1000000, biomass_base_kg: 4000000, f_max: 0.15 },
    { species_code: "PIL", life_stage: "adult", biomass_limit_kg: 9000000, biomass_base_kg: 10000000, f_max: 0.25 },
    { species_code: "MUT", life_stage: "adult", biomass_limit_kg: 500000, biomass_base_kg: 2000000, f_max: 0.2 },
    { species_code: "BFT", life_stage: "", biomass_limit_kg: 2000000, biomass_base_kg: 8000000, f_max: 0.1 },
  ],
} as const satisfies Record<string, readonly HcrRulePayload[]>;
