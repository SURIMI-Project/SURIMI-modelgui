import type { SimulationCaseId } from "../src/data/simulationCases";

// Presentation fixtures, not scientific model boundaries. Camera centres are illustrative.
export const caseMapContent = {
  eyebrow: "The SURIMI explorer",
  title: "One sea.",
  titleAccent: "Many futures.",
  description:
    "Explore the places where marine ecosystems, fisheries and people meet. Choose a case study to begin.",
  bayImage: "/useCasesInfo/anchovy-bay-one-river.svg",
};

export type CaseMapPlace = {
  title: string;
  heading: string;
  category: string;
  detail: string;
  colourToken: string;
  location: [number, number] | null;
  zoom: number;
  bearing: number;
};
export const caseMapPlaces: Record<SimulationCaseId, CaseMapPlace> = {
  "northwestern-mediterranean": {
    title: "Northwestern Mediterranean",
    heading: "Northwestern\nMediterranean",
    category: "Marine case study",
    detail:
      "Ecology, fisheries and the communities that depend on them. Explore a connected marine system in the northwestern Mediterranean.",
    colourToken: "--color-primary",
    location: [3.8, 41.3],
    zoom: 6.1,
    bearing: -14,
  },
  "aegean-sea": {
    title: "Aegean Sea",
    heading: "The Aegean\nperspective.",
    category: "Marine case study",
    detail:
      "An island-rich sea, a changing climate and generations of coastal fisheries. Explore different futures for the Aegean ecosystem.",
    colourToken: "--color-secondary-ink",
    location: [25, 38.4],
    zoom: 6.4,
    bearing: 12,
  },
  "anchovy-bay": {
    title: "Anchovy Bay",
    heading: "A small bay.\nA bigger picture.",
    category: "Educational case study",
    detail:
      "Step into an illustrated bay to explore how fishing pressure, ecosystem health and economic choices connect. A place to learn by exploring.",
    colourToken: "--color-brand-pink",
    location: null,
    zoom: 0,
    bearing: 0,
  },
};

export const overviewBounds: [[number, number], [number, number]] = [
  [-6, 31],
  [32, 46.5],
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
