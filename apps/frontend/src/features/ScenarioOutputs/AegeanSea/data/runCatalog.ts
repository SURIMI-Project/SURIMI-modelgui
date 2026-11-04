import type { ScenarioOutputsDataset } from "../../types";
import createMockScenarioDataset from "../../data/createMockScenarioDataset";
import { createScenarioSpeciesDefinitions } from "../../data/createScenarioSpeciesDefinitions";
import aegeanFishesCsv from "../../../../data/assets/aegean_fishes.csv?raw";

const aegeanSeaSpecies = createScenarioSpeciesDefinitions(aegeanFishesCsv);

export const aegeanSeaRunDatasets: Record<string, ScenarioOutputsDataset> = {
  "1": createMockScenarioDataset({
    caseId: "aegean-sea",
    runId: "1",
    title: "Aegean Sea Scenario Outputs",
    subtitle:
      "Dashboard of scenario outputs showcasing biomass, landings and discards as well as market indicators for the selected period.",
    mapSubtitle:
      "Aegean Sea hotspot intensity for the selected year and species.",
    forecastStartYear: 2028,
    startYear: 2008,
    endYear: 2048,
    metadata: {
      scenario: "aegean-sea",
      run_id: "AES-2026-04-19-001",
      created_at: "2026-04-19T10:24:00Z",
      coordinate_system: "EPSG:4326",
      bounds: {
        xmin: 22.2,
        xmax: 28.9,
        ymin: 35.1,
        ymax: 41.3,
      },
    },
    species: aegeanSeaSpecies,
    anchors: [
      { lon: 23.8, lat: 39.1 },
      { lon: 25.6, lat: 37.8 },
      { lon: 27.2, lat: 38.7 },
    ],
    runSeed: 52,
    biomassBias: 0.08,
    catchesBias: -0.02,
    discardsBias: -0.015,
    marketBias: 0.03,
    priceBias: 0.01,
  }),
  "2": createMockScenarioDataset({
    caseId: "aegean-sea",
    runId: "2",
    title: "Aegean Sea Scenario Outputs",
    subtitle:
      "Dashboard of scenario outputs showcasing biomass, landings and discards as well as market indicators for the selected period.",
    mapSubtitle:
      "Aegean Sea hotspot intensity for the selected year and species.",
    forecastStartYear: 2028,
    startYear: 2008,
    endYear: 2048,
    metadata: {
      scenario: "aegean-sea",
      run_id: "AES-2026-04-17-002",
      created_at: "2026-04-17T15:16:00Z",
      coordinate_system: "EPSG:4326",
      bounds: {
        xmin: 22.2,
        xmax: 28.9,
        ymin: 35.1,
        ymax: 41.3,
      },
    },
    species: aegeanSeaSpecies,
    anchors: [
      { lon: 24.2, lat: 39.0 },
      { lon: 26.1, lat: 37.5 },
      { lon: 27.6, lat: 38.5 },
    ],
    runSeed: 83,
    biomassBias: -0.09,
    catchesBias: 0.12,
    discardsBias: 0.035,
    marketBias: -0.03,
    priceBias: 0.08,
  }),
};
