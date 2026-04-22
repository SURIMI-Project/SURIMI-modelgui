import type { ScenarioOutputsDataset } from "../../types";
import createMockScenarioDataset from "../../data/createMockScenarioDataset";
import { createScenarioSpeciesDefinitions } from "../../data/createScenarioSpeciesDefinitions";
import anchovyFishesCsv from "../../../../data/assets/anchovy_fishes.csv?raw";

const anchovyBaySpecies = createScenarioSpeciesDefinitions(anchovyFishesCsv);

export const anchovyBayRunDatasets: Record<string, ScenarioOutputsDataset> = {
  "1": createMockScenarioDataset({
    caseId: "anchovy-bay",
    runId: "1",
    title: "Anchovy Bay Scenario Outputs",
    subtitle:
      "Dashboard of scenario outputs showcasing biomass, landings and discards as well as market indicators for the selected period.",
    mapSubtitle: "Anchovy Bay hotspot intensity for the selected year and species.",
    forecastStartYear: 2026,
    startYear: 2006,
    endYear: 2046,
    metadata: {
      scenario: "anchovy-bay",
      run_id: "ABY-2026-04-20-001",
      created_at: "2026-04-20T10:21:00Z",
      coordinate_system: "EPSG:4326",
      bounds: {
        xmin: -1.0185,
        xmax: 8.0612,
        ymin: 37.0139,
        ymax: 43.8445,
      },
    },
    species: anchovyBaySpecies,
    anchors: [
      { lon: 0.9, lat: 39.2 },
      { lon: 3.2, lat: 41.1 },
      { lon: 5.7, lat: 40.3 },
    ],
    runSeed: 41,
    biomassBias: 0.1,
    catchesBias: -0.04,
    discardsBias: -0.01,
    marketBias: 0.05,
    priceBias: 0.02,
  }),
  "2": createMockScenarioDataset({
    caseId: "anchovy-bay",
    runId: "2",
    title: "Anchovy Bay Scenario Outputs",
    subtitle:
      "Dashboard of scenario outputs showcasing biomass, landings and discards as well as market indicators for the selected period.",
    mapSubtitle: "Anchovy Bay hotspot intensity for the selected year and species.",
    forecastStartYear: 2026,
    startYear: 2006,
    endYear: 2046,
    metadata: {
      scenario: "anchovy-bay",
      run_id: "ABY-2026-04-19-002",
      created_at: "2026-04-19T14:13:00Z",
      coordinate_system: "EPSG:4326",
      bounds: {
        xmin: -1.0185,
        xmax: 8.0612,
        ymin: 37.0139,
        ymax: 43.8445,
      },
    },
    species: anchovyBaySpecies,
    anchors: [
      { lon: 1.1, lat: 39.4 },
      { lon: 3.6, lat: 41.0 },
      { lon: 5.4, lat: 40.0 },
    ],
    runSeed: 67,
    biomassBias: -0.06,
    catchesBias: 0.09,
    discardsBias: 0.03,
    marketBias: -0.02,
    priceBias: 0.06,
  }),
};
