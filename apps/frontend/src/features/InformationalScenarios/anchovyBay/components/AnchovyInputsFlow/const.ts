import type { SelectableCardOption } from "../../../../../components/SelectableCards/SelectableCards";
import type { SpeciesInputPreset } from "./types";

export const YEAR_OPTIONS: SelectableCardOption[] = [
  { value: "5", title: "5 years", description: "Short calibration window." },
  {
    value: "10",
    title: "10 years",
    description: "Default model-run duration.",
  },
  {
    value: "25",
    title: "25 years",
    description: "Extended scenario exploration.",
  },
  {
    value: "50",
    title: "50 years",
    description: "Long-horizon ecosystem run.",
  },
];

export const IPCC_OPTIONS: SelectableCardOption[] = [
  {
    value: "ssp1-1.9",
    title: "SSP1-1.9",
    meta: "Sustainability / very low emissions",
    description:
      "Strong global cooperation, rapid decarbonisation. Warming ~1.4-1.8 C.",
  },
  {
    value: "ssp1-2.6",
    title: "SSP1-2.6",
    meta: "Sustainability / low emissions",
    description:
      "Similar to RCP2.6 trajectory with controlled emissions. Warming ~1.8-2 C.",
  },
  {
    value: "ssp2-4.5",
    title: "SSP2-4.5",
    meta: "Middle of the road / moderate mitigation",
    description: "Current-policy-like trajectory. Warming ~2.5-3 C.",
  },
  {
    value: "ssp3-7.0",
    title: "SSP3-7.0",
    meta: "Regional rivalry / fragmentation",
    description:
      "Weak cooperation and high population growth. Warming ~3.5-4 C.",
  },
  {
    value: "ssp5-8.5",
    title: "SSP5-8.5",
    meta: "Fossil-fueled development / high emissions",
    description: "Rapid growth with heavy fossil fuel use. Warming ~4-5 C.",
  },
];

export const DEFAULT_SPECIES_INPUTS = [
  {
    ID: "cod",
    LABEL: "Cod",
    BIOMASS_LIMIT: 0.5,
    BIOMASS_BASE: 4.024,
    F_MAX: 0.196,
  },
  {
    ID: "whiting",
    LABEL: "Whiting",
    BIOMASS_LIMIT: 1.103,
    BIOMASS_BASE: 2.207,
    F_MAX: 0.0765,
  },
  {
    ID: "mackerel-ad",
    LABEL: "Mackerel ad",
    BIOMASS_LIMIT: 0.758,
    BIOMASS_BASE: 1.516,
    F_MAX: 0.205,
  },
  {
    ID: "anchovy",
    LABEL: "Anchovy",
    BIOMASS_LIMIT: 4.129,
    BIOMASS_BASE: 8.258,
    F_MAX: 0.141,
  },
  {
    ID: "shrimp",
    LABEL: "Shrimp",
    BIOMASS_LIMIT: 0.442,
    BIOMASS_BASE: 0.884,
    F_MAX: 0.0914,
  },
] as const satisfies readonly SpeciesInputPreset[];

export const INPUT_FLOW_STEPS = [
  {
    key: "inputs",
    title: "Harvest control input",
    subtitle:
      "Harvest control rules (HCR) provide the foundation for modern fisheries management. The rules say, “with this biomass (X-axis), you are allowed to catch this proportion of the biomass (Y-axis)”. From this one can set the actual fishing regulation, be it as a quota or duration of the fishing season. SURIMI uses management strategy evaluation and a large number of simulations to find HCR that are robust to uncertainty in both the ecosystem and management.",
  },
  {
    key: "years",
    title: "How long would you like to run your simulation for?",
    subtitle:
      "If you choose 5 or 10 years, the simulation will automatically choose the SPP2 scenario (“Business-as-usual”).",
  },
  {
    key: "ipcc",
    title: "Select IPCC Scenario",
    subtitle: "Choose one climate scenario for long-horizon runs (> 10 years).",
  },
] as const;

export const HARVEST_CONTROL_INPUT_INFO =
  "Harvest control rules (HCR) provide the foundation for modern fisheries management. The rules say, “with this biomass (X-axis), you are allowed to catch this proportion of the biomass (Y-axis)”. From this one can set the actual fishing regulation, be it as a quota or duration of the fishing season. SURIMI uses management strategy evaluation and a large number of simulations to find HCR that are robust to uncertainty in both the ecosystem and management.";

export const IPCC_SCENARIO_DESCRIPTION =
  "An IPCC scenario (Intergovernmental Panel on Climate Change scenario) is a plausible description of how the future might unfold, used to study climate change, its impacts, and possible responses. In SURIMI we use IPCC scenarios to run models under different futures and support decision-making under uncertainty.";

export const CHART_POINT_LABELS = [
  "Origin",
  "F min control",
  "F max control",
  "Biomass max",
] as const;
