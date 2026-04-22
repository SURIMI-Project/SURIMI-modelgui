import type {
  AnchovyBayAnnualOutputsData,
  AnnualMetricCell,
  SpeciesAnnualOutput,
} from "../types";
import { anchovyBaySimulationMetadata } from "./simulationMetadata";

const START_YEAR = 2006;
const END_YEAR = 2046;
export const ANCHOVY_BAY_FORECAST_START_YEAR = 2026;
const YEARS = Array.from(
  { length: END_YEAR - START_YEAR + 1 },
  (_, index) => START_YEAR + index,
);

const SPECIES_CODES = ["MTS", "NEP", "ARA", "PIL", "HKE", "MAC", "PAC"];
const POINTS_PER_SPECIES = 78;

const { xmin, xmax, ymin, ymax } = anchovyBaySimulationMetadata.bounds;

const normalize = (value: number) => value - Math.floor(value);

const clamp = (value: number, min: number, max: number) => {
  return Math.min(max, Math.max(min, value));
};

const distance = (x1: number, y1: number, x2: number, y2: number) => {
  return Math.hypot(x1 - x2, y1 - y2);
};

const anchors = [
  { lon: 0.9, lat: 39.2 },
  { lon: 3.2, lat: 41.1 },
  { lon: 5.7, lat: 40.3 },
];

const buildBaseCoordinates = (speciesIndex: number) => {
  return Array.from({ length: POINTS_PER_SPECIES }, (_, pointIndex) => {
    const clusterIndex = pointIndex % anchors.length;
    const anchor = anchors[clusterIndex];

    const jitterSeedA = normalize(
      Math.sin((pointIndex + 1) * (speciesIndex + 2) * 1.43),
    );
    const jitterSeedB = normalize(
      Math.cos((pointIndex + 4) * (speciesIndex + 3) * 1.17),
    );

    const lonJitter = (jitterSeedA - 0.5) * 1.25;
    const latJitter = (jitterSeedB - 0.5) * 1.05;

    return {
      longitude: clamp(anchor.lon + lonJitter, xmin, xmax),
      latitude: clamp(anchor.lat + latJitter, ymin, ymax),
      pointIndex,
    };
  });
};

const buildCellsForYear = (
  speciesIndex: number,
  yearIndex: number,
  baseCoordinates: ReturnType<typeof buildBaseCoordinates>,
): AnnualMetricCell[] => {
  const year = YEARS[yearIndex];
  const isHistorical = year < ANCHOVY_BAY_FORECAST_START_YEAR;
  const eraT = yearIndex / (YEARS.length - 1);
  const decadePulse = Math.sin(eraT * Math.PI * 5.2 + speciesIndex * 0.46);
  const longTrend = Math.cos(eraT * Math.PI * 1.8 + speciesIndex * 0.31);
  const yearShock =
    (Math.sin((yearIndex + 1) * 1.91 + speciesIndex * 0.73) +
      Math.cos((yearIndex + 1) * 0.87 + speciesIndex * 0.29) * 0.7 +
      Math.sin((yearIndex + 1) * 3.4 + speciesIndex * 0.17) * 0.4) /
    2.1;
  const shockStrength = isHistorical ? 1 : 0.45;

  const hotspotCenters = anchors.map((anchor, hotspotIndex) => ({
    lon:
      anchor.lon +
      Math.sin(
        eraT * Math.PI * 2.4 + hotspotIndex * 1.33 + speciesIndex * 0.2,
      ) *
        0.65,
    lat:
      anchor.lat +
      Math.cos(
        eraT * Math.PI * 2.1 + hotspotIndex * 1.18 + speciesIndex * 0.15,
      ) *
        0.48,
  }));

  return baseCoordinates.map((baseCoord) => {
    const hotspotStrength = hotspotCenters.reduce(
      (maxStrength, hotspotCenter) => {
        const d = distance(
          baseCoord.longitude,
          baseCoord.latitude,
          hotspotCenter.lon,
          hotspotCenter.lat,
        );
        const strength = Math.exp(-(d * d) / (2 * 0.9 * 0.9));
        return Math.max(maxStrength, strength);
      },
      0,
    );

    const microVariation =
      normalize(
        Math.sin(
          (baseCoord.pointIndex + 2) * 1.51 + yearIndex * 0.19 + speciesIndex,
        ),
      ) * 0.28;

    const pressureFactor = clamp(
      0.22 + hotspotStrength * 0.95 + (decadePulse + 1) * 0.17 + microVariation,
      0.05,
      1.55,
    );

    const biomassBase = 0.7 + hotspotStrength * 4.2 + speciesIndex * 0.24;
    const biomassTrend =
      0.82 +
      (longTrend + 1) * 0.16 -
      pressureFactor * 0.09 +
      yearShock * 0.085 * shockStrength;
    const biomass = clamp(biomassBase * biomassTrend, 0.12, 8.7);

    const catchesBase = 260 + hotspotStrength * 5200 + speciesIndex * 175;
    const catchesTrend =
      0.64 +
      pressureFactor * 0.82 +
      (1 - longTrend) * 0.14 +
      yearShock * 0.13 * shockStrength;
    const catches = clamp(catchesBase * catchesTrend, 55, 7600);

    const discardsRate = clamp(
      0.04 +
        pressureFactor * 0.12 +
        (1 - biomass / 8.7) * 0.18 +
        yearShock * 0.028 * shockStrength,
      0.03,
      0.42,
    );
    const discards = clamp(catches * discardsRate, 4, 2800);
    const landings = catches + discards;

    const longitudeShift =
      Math.sin(
        yearIndex * 0.12 + baseCoord.pointIndex * 0.08 + speciesIndex * 0.2,
      ) * 0.035;
    const latitudeShift =
      Math.cos(
        yearIndex * 0.11 + baseCoord.pointIndex * 0.07 + speciesIndex * 0.3,
      ) * 0.029;

    return {
      longitude: clamp(baseCoord.longitude + longitudeShift, xmin, xmax),
      latitude: clamp(baseCoord.latitude + latitudeShift, ymin, ymax),
      biomass: Number(biomass.toFixed(3)),
      landings: Number(landings.toFixed(2)),
      catches: Number(catches.toFixed(2)),
      discards: Number(discards.toFixed(2)),
    };
  });
};

const speciesOutputs: SpeciesAnnualOutput[] = SPECIES_CODES.map(
  (speciesCode, speciesIndex) => {
    const baseCoordinates = buildBaseCoordinates(speciesIndex);

    return {
      species_code: speciesCode,
      annual_grids: YEARS.map((_, yearIndex) => ({
        year: YEARS[yearIndex],
        cells: buildCellsForYear(speciesIndex, yearIndex, baseCoordinates),
      })),
    };
  },
);

export const anchovyBayAnnualOutputsData: AnchovyBayAnnualOutputsData = {
  years: YEARS,
  species_outputs: speciesOutputs,
};
