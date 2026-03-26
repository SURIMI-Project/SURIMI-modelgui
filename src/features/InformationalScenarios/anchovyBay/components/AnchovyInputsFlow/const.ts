import type { SelectableCardOption } from "../../../../../components/SelectableCards/SelectableCards";

export const YEAR_OPTIONS: SelectableCardOption[] = [
  {
    value: "50",
    title: "50 years",
    description: "Long-horizon ecosystem run.",
  },
  {
    value: "25",
    title: "25 years",
    description: "Extended scenario exploration.",
  },
  {
    value: "10",
    title: "10 years",
    description: "Default model-run duration.",
  },
  { value: "5", title: "5 years", description: "Short calibration window." },
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
] as const;

export const INPUT_FLOW_STEPS = [
  {
    key: "inputs",
    title: "Anchovy Bay · Harvest control inputs",
    subtitle:
      "Pick a species, drag the two control points in the graph, and the biomass and fishing-mortality values update instantly.",
  },
  {
    key: "years",
    title: "Select Duration Of Model Run",
    subtitle:
      "Choose a run duration. For 10 years or less, the modal closes immediately.",
  },
  {
    key: "ipcc",
    title: "Select IPCC Scenario",
    subtitle:
      "Choose one climate scenario for long-horizon runs (> 10 years).",
  },
] as const;

export const CHART_POINT_LABELS = [
  "Origin",
  "F min control",
  "F max control",
  "Biomass max",
] as const;
