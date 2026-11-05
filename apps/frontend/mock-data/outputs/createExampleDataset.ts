import type { SimulationCaseId } from "../../src/data/simulationCases";
import type {
  AnnualMetricCell,
  PricesData,
  SalesData,
  ScenarioOutputsDataset,
  ScenarioSimulationMetadata,
  SpeciesAnnualOutput,
  SpeciesOption,
  SpeciesPresentation,
} from "../../src/features/ScenarioOutputs/types";

type ScenarioSpeciesDefinition = {
  code: string;
  displayName: string;
  scientificName: string;
  functionalGroupKey: string;
  functionalGroupName: string;
  basePrice: number;
  baseSalesQuantity: number;
};

type MockDatasetConfig = {
  caseId: SimulationCaseId;
  runId: string;
  title: string;
  subtitle: string;
  mapSubtitle: string;
  forecastStartYear: number;
  startYear: number;
  endYear: number;
  metadata: ScenarioSimulationMetadata;
  species: ScenarioSpeciesDefinition[];
  anchors: Array<{ lon: number; lat: number }>;
  runSeed: number;
  biomassBias: number;
  catchesBias: number;
  discardsBias: number;
  marketBias: number;
  priceBias: number;
};

const ALL_FUNCTIONAL_GROUPS_VALUE = "all";
const POINTS_PER_SPECIES = 64;

const normalize = (value: number) => value - Math.floor(value);

const clamp = (value: number, min: number, max: number) => {
  return Math.min(max, Math.max(min, value));
};

const distance = (x1: number, y1: number, x2: number, y2: number) => {
  return Math.hypot(x1 - x2, y1 - y2);
};

const buildYears = (startYear: number, endYear: number) => {
  return Array.from(
    { length: endYear - startYear + 1 },
    (_, index) => startYear + index,
  );
};

const buildFunctionalGroupOptions = (
  species: ScenarioSpeciesDefinition[],
): SpeciesOption[] => {
  const groups = new Map<string, string>();

  species.forEach((entry) => {
    groups.set(entry.functionalGroupKey, entry.functionalGroupName);
  });

  return [
    {
      value: ALL_FUNCTIONAL_GROUPS_VALUE,
      label: "All functional groups",
    },
    ...[...groups.entries()]
      .sort((a, b) => a[1].localeCompare(b[1]))
      .map(([value, label]) => ({ value, label })),
  ];
};

const buildSpeciesPresentation = (
  species: ScenarioSpeciesDefinition[],
): Record<string, SpeciesPresentation> => {
  return species.reduce<Record<string, SpeciesPresentation>>(
    (accumulator, entry) => {
      accumulator[entry.code.toLowerCase()] = {
        displayName: entry.displayName,
        scientificName: entry.scientificName,
        functionalGroupKey: entry.functionalGroupKey,
        functionalGroupName: entry.functionalGroupName,
      };
      return accumulator;
    },
    {},
  );
};

const buildBaseCoordinates = (
  speciesIndex: number,
  anchors: Array<{ lon: number; lat: number }>,
  bounds: ScenarioSimulationMetadata["bounds"],
  runSeed: number,
) => {
  return Array.from({ length: POINTS_PER_SPECIES }, (_, pointIndex) => {
    const clusterIndex = pointIndex % anchors.length;
    const anchor = anchors[clusterIndex];
    const jitterSeedA = normalize(
      Math.sin(
        (pointIndex + 1) * (speciesIndex + 2.2) * (1.27 + runSeed * 0.003),
      ),
    );
    const jitterSeedB = normalize(
      Math.cos(
        (pointIndex + 4) * (speciesIndex + 3.4) * (1.11 + runSeed * 0.002),
      ),
    );

    return {
      pointIndex,
      longitude: clamp(
        anchor.lon + (jitterSeedA - 0.5) * 1.28,
        bounds.xmin,
        bounds.xmax,
      ),
      latitude: clamp(
        anchor.lat + (jitterSeedB - 0.5) * 0.96,
        bounds.ymin,
        bounds.ymax,
      ),
    };
  });
};

const buildCellsForYear = ({
  years,
  yearIndex,
  speciesIndex,
  baseCoordinates,
  anchors,
  forecastStartYear,
  bounds,
  biomassBias,
  catchesBias,
  discardsBias,
  runSeed,
}: {
  years: number[];
  yearIndex: number;
  speciesIndex: number;
  baseCoordinates: ReturnType<typeof buildBaseCoordinates>;
  anchors: Array<{ lon: number; lat: number }>;
  forecastStartYear: number;
  bounds: ScenarioSimulationMetadata["bounds"];
  biomassBias: number;
  catchesBias: number;
  discardsBias: number;
  runSeed: number;
}): AnnualMetricCell[] => {
  const year = years[yearIndex];
  const isHistorical = year < forecastStartYear;
  const eraT = yearIndex / Math.max(years.length - 1, 1);
  const decadePulse = Math.sin(
    eraT * Math.PI * (4.2 + runSeed * 0.002) + speciesIndex * 0.52,
  );
  const longTrend = Math.cos(
    eraT * Math.PI * (1.7 + runSeed * 0.001) + speciesIndex * 0.27,
  );
  const yearShock =
    (Math.sin((yearIndex + 1) * (1.81 + runSeed * 0.001)) +
      Math.cos((yearIndex + 1) * 0.93 + speciesIndex * 0.31) * 0.72 +
      Math.sin((yearIndex + 1) * 3.11 + speciesIndex * 0.21) * 0.42) /
    2.14;
  const shockStrength = isHistorical ? 1 : 0.52;

  const hotspotCenters = anchors.map((anchor, hotspotIndex) => ({
    lon:
      anchor.lon +
      Math.sin(
        eraT * Math.PI * 2.1 + hotspotIndex * 1.34 + speciesIndex * 0.18,
      ) *
        0.68,
    lat:
      anchor.lat +
      Math.cos(
        eraT * Math.PI * 1.9 + hotspotIndex * 1.12 + speciesIndex * 0.14,
      ) *
        0.54,
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
        const strength = Math.exp(-(d * d) / (2 * 0.96 * 0.96));
        return Math.max(maxStrength, strength);
      },
      0,
    );

    const microVariation =
      normalize(
        Math.sin(
          (baseCoord.pointIndex + 2) * 1.44 +
            yearIndex * 0.17 +
            speciesIndex +
            runSeed * 0.01,
        ),
      ) * 0.31;

    const pressureFactor = clamp(
      0.24 + hotspotStrength * 0.94 + (decadePulse + 1) * 0.18 + microVariation,
      0.06,
      1.62,
    );

    const biomassBase = 0.78 + hotspotStrength * 4.4 + speciesIndex * 0.29;
    const biomassTrend =
      0.8 +
      (longTrend + 1) * 0.17 -
      pressureFactor * 0.08 +
      biomassBias +
      yearShock * 0.084 * shockStrength;
    const biomass = clamp(biomassBase * biomassTrend, 0.12, 9.4);

    const catchesBase = 290 + hotspotStrength * 5400 + speciesIndex * 188;
    const catchesTrend =
      0.62 +
      pressureFactor * 0.84 +
      (1 - longTrend) * 0.16 +
      catchesBias +
      yearShock * 0.14 * shockStrength;
    const catches = clamp(catchesBase * catchesTrend, 50, 8100);

    const discardsRate = clamp(
      0.04 +
        pressureFactor * 0.11 +
        (1 - biomass / 9.4) * 0.17 +
        discardsBias +
        yearShock * 0.027 * shockStrength,
      0.02,
      0.44,
    );
    const discards = clamp(catches * discardsRate, 4, 3000);
    const landings = catches + discards;

    const longitudeShift =
      Math.sin(
        yearIndex * 0.11 + baseCoord.pointIndex * 0.09 + speciesIndex * 0.17,
      ) * 0.038;
    const latitudeShift =
      Math.cos(
        yearIndex * 0.12 + baseCoord.pointIndex * 0.08 + speciesIndex * 0.22,
      ) * 0.031;

    return {
      longitude: clamp(
        baseCoord.longitude + longitudeShift,
        bounds.xmin,
        bounds.xmax,
      ),
      latitude: clamp(
        baseCoord.latitude + latitudeShift,
        bounds.ymin,
        bounds.ymax,
      ),
      biomass: Number(biomass.toFixed(3)),
      landings: Number(landings.toFixed(2)),
      catches: Number(catches.toFixed(2)),
      discards: Number(discards.toFixed(2)),
    };
  });
};

const buildSpeciesOutputs = (
  config: MockDatasetConfig,
  years: number[],
): SpeciesAnnualOutput[] => {
  return config.species.map((entry, speciesIndex) => {
    const baseCoordinates = buildBaseCoordinates(
      speciesIndex,
      config.anchors,
      config.metadata.bounds,
      config.runSeed,
    );

    return {
      species_code: entry.code,
      annual_grids: years.map((year, yearIndex) => ({
        year,
        cells: buildCellsForYear({
          years,
          yearIndex,
          speciesIndex,
          baseCoordinates,
          anchors: config.anchors,
          forecastStartYear: config.forecastStartYear,
          bounds: config.metadata.bounds,
          biomassBias: config.biomassBias,
          catchesBias: config.catchesBias,
          discardsBias: config.discardsBias,
          runSeed: config.runSeed,
        }),
      })),
    };
  });
};

const buildSalesData = (config: MockDatasetConfig): SalesData => {
  const markets = ["MRK-A", "MRK-B", "MRK-C"];

  return {
    sales_summaries: markets.map((marketCode, marketIndex) => ({
      market_code: marketCode,
      currency: "EUR",
      sales: config.species
        .filter(
          (_, speciesIndex) => speciesIndex % markets.length === marketIndex,
        )
        .map((entry, speciesIndex) => {
          const multiplier =
            0.78 +
            marketIndex * 0.06 +
            speciesIndex * 0.04 +
            config.marketBias +
            Math.sin(config.runSeed * 0.01 + speciesIndex * 0.9) * 0.06;

          return {
            species: { species_code: entry.code },
            quantity: Number((entry.baseSalesQuantity * multiplier).toFixed(1)),
            value: Number(
              (
                entry.baseSalesQuantity *
                entry.basePrice *
                multiplier *
                0.12
              ).toFixed(2),
            ),
          };
        }),
    })),
  };
};

const buildPricesData = (config: MockDatasetConfig): PricesData => {
  return {
    prices: config.species.map((entry, speciesIndex) => {
      const multiplier =
        0.88 +
        config.priceBias +
        speciesIndex * 0.03 +
        Math.cos(config.runSeed * 0.008 + speciesIndex * 0.74) * 0.05;

      return {
        species: { species_code: entry.code },
        market_code: `MRK-${(speciesIndex % 3) + 1}`,
        price: Number((entry.basePrice * multiplier).toFixed(3)),
        currency: "EUR",
      };
    }),
  };
};

export const createExampleDataset = (
  config: MockDatasetConfig,
): ScenarioOutputsDataset => {
  const years = buildYears(config.startYear, config.endYear);

  return {
    caseId: config.caseId,
    runId: config.runId,
    title: config.title,
    subtitle: config.subtitle,
    mapSubtitle: config.mapSubtitle,
    forecastStartYear: config.forecastStartYear,
    years,
    species_outputs: buildSpeciesOutputs(config, years),
    simulationMetadata: config.metadata,
    salesData: buildSalesData(config),
    pricesData: buildPricesData(config),
    speciesPresentationByKey: buildSpeciesPresentation(config.species),
    functionalGroupOptions: buildFunctionalGroupOptions(config.species),
  };
};

export default createExampleDataset;
export type { MockDatasetConfig, ScenarioSpeciesDefinition };
