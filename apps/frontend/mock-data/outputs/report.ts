import createExampleDataset from "./createExampleDataset";
import { createScenarioSpeciesDefinitions } from "../species/createSpeciesDefinitions";
import anchovyFishesCsv from "../species/anchovy_fishes";

const anchovyBaySpecies = createScenarioSpeciesDefinitions(anchovyFishesCsv);

// One deterministic fixture, built once; never derived from form inputs or run IDs.
export const exampleReport = createExampleDataset({
    caseId: "anchovy-bay",
    runId: "demo",
    title: "Shared example simulation report",
    subtitle:
      "Demo data shared by all case studies. Inputs do not run a simulation or change these results.",
    mapSubtitle: "Example map — shared fixture, not results for the selected case study.",
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
  });
