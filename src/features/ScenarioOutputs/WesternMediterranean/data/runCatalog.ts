import type { ScenarioOutputsDataset } from "../../types";
import {
  createMockScenarioDataset,
  type ScenarioSpeciesDefinition,
} from "../../data/createMockScenarioDataset";

const northwesternMediterraneanSpecies: ScenarioSpeciesDefinition[] = [
  {
    code: "PIL",
    displayName: "European sardine",
    scientificName: "Sardina pilchardus",
    functionalGroupKey: "small_pelagic_fishes",
    functionalGroupName: "Small pelagic fishes",
    basePrice: 1.86,
    baseSalesQuantity: 254,
  },
  {
    code: "ANE",
    displayName: "European anchovy",
    scientificName: "Engraulis encrasicolus",
    functionalGroupKey: "small_pelagic_fishes",
    functionalGroupName: "Small pelagic fishes",
    basePrice: 1.95,
    baseSalesQuantity: 241,
  },
  {
    code: "HKE",
    displayName: "European hake",
    scientificName: "Merluccius merluccius",
    functionalGroupKey: "large_demersal_fishes",
    functionalGroupName: "Large demersal fishes",
    basePrice: 3.61,
    baseSalesQuantity: 158,
  },
  {
    code: "ARA",
    displayName: "Blue and red shrimp",
    scientificName: "Aristeus antennatus",
    functionalGroupKey: "crustaceans",
    functionalGroupName: "Crustaceans",
    basePrice: 3.22,
    baseSalesQuantity: 118,
  },
  {
    code: "MAC",
    displayName: "Atlantic mackerel",
    scientificName: "Scomber scombrus",
    functionalGroupKey: "medium_pelagic_fishes",
    functionalGroupName: "Medium pelagic fishes",
    basePrice: 1.29,
    baseSalesQuantity: 208,
  },
  {
    code: "BOG",
    displayName: "Bogue",
    scientificName: "Boops boops",
    functionalGroupKey: "small_demersal_fishes",
    functionalGroupName: "Small demersal fishes",
    basePrice: 1.37,
    baseSalesQuantity: 144,
  },
];

export const northwesternMediterraneanRunDatasets: Record<
  string,
  ScenarioOutputsDataset
> = {
  "northwestern-mediterranean-sardine-25y-ssp245": createMockScenarioDataset({
    caseId: "northwestern-mediterranean",
    runId: "northwestern-mediterranean-sardine-25y-ssp245",
    title: "Northwestern Mediterranean Scenario Outputs",
    subtitle:
      "Dashboard of scenario outputs showcasing biomass, landings and discards as well as market indicators for the selected period.",
    mapSubtitle:
      "Northwestern Mediterranean hotspot intensity for the selected year and species.",
    forecastStartYear: 2027,
    startYear: 2007,
    endYear: 2047,
    metadata: {
      scenario: "northwestern-mediterranean",
      run_id: "NWM-2026-04-20-001",
      created_at: "2026-04-20T09:51:00Z",
      coordinate_system: "EPSG:4326",
      bounds: {
        xmin: 0.2,
        xmax: 7.8,
        ymin: 39.2,
        ymax: 43.9,
      },
    },
    species: northwesternMediterraneanSpecies,
    anchors: [
      { lon: 1.2, lat: 41.4 },
      { lon: 3.8, lat: 42.6 },
      { lon: 6.1, lat: 40.9 },
    ],
    runSeed: 58,
    biomassBias: 0.04,
    catchesBias: 0.03,
    discardsBias: 0.005,
    marketBias: 0.04,
    priceBias: 0.02,
  }),
  "northwestern-mediterranean-hake-50y-ssp370": createMockScenarioDataset({
    caseId: "northwestern-mediterranean",
    runId: "northwestern-mediterranean-hake-50y-ssp370",
    title: "Northwestern Mediterranean Scenario Outputs",
    subtitle:
      "Dashboard of scenario outputs showcasing biomass, landings and discards as well as market indicators for the selected period.",
    mapSubtitle:
      "Northwestern Mediterranean hotspot intensity for the selected year and species.",
    forecastStartYear: 2027,
    startYear: 2007,
    endYear: 2047,
    metadata: {
      scenario: "northwestern-mediterranean",
      run_id: "NWM-2026-04-18-002",
      created_at: "2026-04-18T13:32:00Z",
      coordinate_system: "EPSG:4326",
      bounds: {
        xmin: 0.2,
        xmax: 7.8,
        ymin: 39.2,
        ymax: 43.9,
      },
    },
    species: northwesternMediterraneanSpecies,
    anchors: [
      { lon: 1.4, lat: 41.2 },
      { lon: 4.2, lat: 42.3 },
      { lon: 6.4, lat: 40.7 },
    ],
    runSeed: 91,
    biomassBias: -0.08,
    catchesBias: 0.11,
    discardsBias: 0.04,
    marketBias: -0.01,
    priceBias: 0.07,
  }),
};
