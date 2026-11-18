// Static explanatory copy, not scenario availability. Eligibility comes from experiment-options.
// SSP copy is transcribed verbatim from the PM-approved screenshot (2026-11-18).
export const climateHeading = "Select IPCC Scenario";
export const climateSubtitle = "Choose one climate scenario for long-horizon runs (> 10 years).";
export const climateSectionTitle = "IPCC scenarios";
export const climateIntroduction = "An IPCC scenario (Intergovernmental Panel on Climate Change scenario) is a plausible description of how the future might unfold, used to study climate change, its impacts, and possible responses. In SURIMI we use IPCC scenarios to run models under different futures and support decision-making under uncertainty.";
export type ClimateScenarioContent = { title: string; category: string; description: string };
export const climateSources = {
  rcp: "https://climate-scenarios.canada.ca/index.php?lang=en&page=scen-rcp",
  ssp: "https://www.ipcc.ch/report/ar6/wg1/chapter/summary-for-policymakers/",
};
const scenarios: Record<string, ClimateScenarioContent> = {
  "RCP2.6": { title: "RCP 2.6", category: "Low emissions · strong mitigation", description: "A low-emissions pathway with active mitigation to reduce greenhouse gas emissions. Explore an ecosystem future under stronger climate action." },
  "RCP4.5": { title: "RCP 4.5", category: "Intermediate pathway", description: "An intermediate concentration pathway between the low and high scenarios. Explore ecosystem responses under a different level of climate forcing." },
  "RCP6.0": { title: "RCP 6.0", category: "Intermediate pathway · higher forcing", description: "An intermediate concentration pathway with higher climate forcing than RCP 4.5. Compare ecosystem responses across different climate futures." },
  "RCP8.5": { title: "RCP 8.5", category: "High emissions", description: "A high-emissions pathway. Explore ecosystem responses under stronger climate forcing and compare them with lower-emissions futures." },
  "SSP11.9": { title: "SSP1-1.9", category: "SUSTAINABILITY / VERY LOW EMISSIONS", description: "Strong global cooperation, rapid decarbonisation. Warming ~1.4–1.8 C." },
  "SSP12.6": { title: "SSP1-2.6", category: "SUSTAINABILITY / LOW EMISSIONS", description: "Similar to RCP2.6 trajectory with controlled emissions. Warming ~1.8–2 C." },
  "SSP24.5": { title: "SSP2-4.5", category: "MIDDLE OF THE ROAD / MODERATE MITIGATION", description: "Current-policy-like trajectory. Warming ~2.5–3 C." },
  "SSP37.0": { title: "SSP3-7.0", category: "REGIONAL RIVALRY / FRAGMENTATION", description: "Weak cooperation and high population growth. Warming ~3.5–4 C." },
  "SSP58.5": { title: "SSP5-8.5", category: "FOSSIL-FUELLED DEVELOPMENT / HIGH EMISSIONS", description: "Rapid growth with heavy fossil fuel use. Warming ~4–5 C." },
};
export function getClimateScenarioContent(value: string): ClimateScenarioContent {
  return scenarios[value.toUpperCase().replace(/[\s_-]/g, "")]
    ?? { title: value, category: "Climate pathway", description: "A climate pathway available for this case study." };
}
