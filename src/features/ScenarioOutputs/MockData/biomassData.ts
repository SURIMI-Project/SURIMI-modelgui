import type { BiomassData, BiomassGrid } from "../types";
import { anchovyBaySimulationMetadata } from "./simulationMetadata";

const { xmin, xmax, ymin, ymax } = anchovyBaySimulationMetadata.bounds;
const speciesCodes = ["MTS", "NEP", "ARA", "PIL", "HKE", "MAC", "PAC"];

const normalized = (value: number) => value - Math.floor(value);

const buildBiomassCells = (speciesIndex: number) => {
  return Array.from({ length: 24 }, (_, index) => {
    const xSeed = normalized(Math.sin((index + 1) * (speciesIndex + 1) * 1.47));
    const ySeed = normalized(Math.cos((index + 2) * (speciesIndex + 2) * 1.11));
    const valueSeed = normalized(
      Math.sin((index + 3) * (speciesIndex + 3) * 2.03),
    );

    return {
      longitude: xmin + (xmax - xmin) * xSeed,
      latitude: ymin + (ymax - ymin) * ySeed,
      biomass: Number((1.6 + valueSeed * 4.8 + speciesIndex * 0.24).toFixed(3)),
    };
  });
};

const biomassGrids: BiomassGrid[] = speciesCodes.map((speciesCode, index) => ({
  species: { species_code: speciesCode },
  biomass_cells: buildBiomassCells(index),
}));

export const biomassData: BiomassData = {
  biomass_grids: biomassGrids,
};
