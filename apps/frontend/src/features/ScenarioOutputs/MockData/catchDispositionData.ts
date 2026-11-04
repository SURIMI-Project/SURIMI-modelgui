import type { CatchDispositionData, CatchDispositionGrid } from "../types";
import { anchovyBaySimulationMetadata } from "./simulationMetadata";

const { xmin, xmax, ymin, ymax } = anchovyBaySimulationMetadata.bounds;
const speciesCodes = ["MTS", "NEP", "ARA", "PIL", "HKE", "MAC", "PAC"];

const normalized = (value: number) => value - Math.floor(value);

const buildDispositionCells = (speciesIndex: number) => {
  return Array.from({ length: 18 }, (_, index) => {
    const xSeed = normalized(Math.sin((index + 2) * (speciesIndex + 2) * 1.31));
    const ySeed = normalized(Math.cos((index + 1) * (speciesIndex + 1) * 1.19));
    const catchSeed = normalized(
      Math.sin((index + 4) * (speciesIndex + 3) * 2.11),
    );

    const grossCatch = 1400 + catchSeed * 5100 + speciesIndex * 120;
    const liveDiscards =
      grossCatch * (0.08 + normalized(catchSeed * 3.1) * 0.06);
    const deadDiscards =
      grossCatch * (0.05 + normalized(catchSeed * 2.4) * 0.05);

    return {
      longitude: xmin + (xmax - xmin) * xSeed,
      latitude: ymin + (ymax - ymin) * ySeed,
      gross_catch: Number(grossCatch.toFixed(2)),
      live_discards: Number(liveDiscards.toFixed(2)),
      dead_discards: Number(deadDiscards.toFixed(2)),
    };
  });
};

const dispositionGrids: CatchDispositionGrid[] = speciesCodes.map(
  (speciesCode, index) => ({
    fleet_segment: {
      gear_code: ["ART", "OTB", "PS", "GNS"][index % 4],
      country_code: "ESP",
    },
    species: {
      species_code: speciesCode,
    },
    disposition_cells: buildDispositionCells(index),
  }),
);

export const catchDispositionData: CatchDispositionData = {
  disposition_grids: dispositionGrids,
};
