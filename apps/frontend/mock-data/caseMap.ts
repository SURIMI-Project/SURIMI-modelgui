import type { SimulationCaseId } from "../src/data/simulationCases";

export type CaseMapPlace = {
  title: string;
  location: [number, number] | null;
  zoom: number;
  bearing: number;
};
export const caseMapPlaces: Record<SimulationCaseId, CaseMapPlace> = {
  "northwestern-mediterranean": {
    title: "Northwestern Mediterranean",
    location: [3.8, 41.3],
    zoom: 6.1,
    bearing: -14,
  },
  "aegean-sea": {
    title: "Aegean Sea",
    location: [25, 38.4],
    zoom: 6.4,
    bearing: 12,
  },
  "anchovy-bay": {
    title: "Anchovy Bay",
    location: null,
    zoom: 0,
    bearing: 0,
  },
};

export const overviewBounds: [[number, number], [number, number]] = [
  [-8, 30],
  [34, 47.5],
];

// Official FAO/GFCM source geometry lives in public/maps; this is presentation configuration.
export const aegeanStudyArea = {
  asset: "/maps/aegean-gsa-22-23.geojson",
  label: "Aegean study area · GSA 22 + 23",
  shortLabel: "Aegean Sea",
  subareas: "GSA 22 + 23",
  introduction:
    "Explore the connected ecosystems and fisheries of the Aegean Sea and Crete.",
  credit: "Boundaries: FAO/GFCM",
  source: "https://www.fao.org/gfcm/data/maps/geographical-subareas/en",
  bounds: [
    [22.53159, 34],
    [29, 41.09133],
  ] as [[number, number], [number, number]],
};

export const northwesternStudyArea = {
  asset: "/maps/northwestern-gsa-06-07.geojson",
  label: "Northwestern Mediterranean study area · GSA 06 + 07",
  credit: "Boundaries: FAO/GFCM",
  source: "https://www.fao.org/gfcm/data/maps/geographical-subareas/en",
  bounds: [
    [-1.00001, 37],
    [8.00001, 43.92397],
  ] as [[number, number], [number, number]],
};
