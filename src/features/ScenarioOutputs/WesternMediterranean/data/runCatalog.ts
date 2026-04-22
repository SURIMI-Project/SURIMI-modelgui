import type { ScenarioOutputsDataset } from "../../types";
import createMockScenarioDataset from "../../data/createMockScenarioDataset";
import { createScenarioSpeciesDefinitions } from "../../data/createScenarioSpeciesDefinitions";
import westMediterraneanFishesCsv from "../../../../data/assets/west_med_fishes.csv?raw";

const northwesternMediterraneanSpecies = createScenarioSpeciesDefinitions(
  westMediterraneanFishesCsv,
);

export const northwesternMediterraneanRunDatasets: Record<
  string,
  ScenarioOutputsDataset
> = {
  "1": createMockScenarioDataset({
    caseId: "northwestern-mediterranean",
    runId: "1",
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
  "2": createMockScenarioDataset({
    caseId: "northwestern-mediterranean",
    runId: "2",
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
