import type { SimulationCaseId } from "../src/data/simulationCases";

// Presentation fixtures, not scientific model boundaries. Camera centres are illustrative.
export const caseMapContent = {
  eyebrow: "The SURIMI explorer",
  title: "One sea.",
  titleAccent: "Many futures.",
  description: "Explore the places where marine ecosystems, fisheries and people meet. Choose a case study to begin.",
  locationNote: "Illustrative locations · study boundaries to be confirmed",
  bayImage: "/useCasesInfo/anchovy-bay-one-river.svg",
};

export type CaseMapPlace = {
  number: string;
  title: string;
  heading: string;
  category: string;
  detail: string;
  colour: string;
  location: [number, number] | null;
  zoom: number;
  bearing: number;
};
export const caseMapPlaces: Record<SimulationCaseId, CaseMapPlace> = {
  "northwestern-mediterranean": {
    number: "01", title: "Northwestern Mediterranean", heading: "Northwestern\nMediterranean",
    category: "Marine case study", detail: "Ecology, fisheries and the communities that depend on them. Explore a connected marine system in the northwestern Mediterranean.",
    colour: "#88e1c5", location: [3.8, 41.3], zoom: 6.1, bearing: -14,
  },
  "aegean-sea": {
    number: "02", title: "Aegean Sea", heading: "The Aegean\nperspective.",
    category: "Marine case study", detail: "An island-rich sea, a changing climate and generations of coastal fisheries. Explore different futures for the Aegean ecosystem.",
    colour: "#eaa58e", location: [25, 38.4], zoom: 6.4, bearing: 12,
  },
  "anchovy-bay": {
    number: "03", title: "Anchovy Bay", heading: "A small bay.\nA bigger picture.",
    category: "Educational case study", detail: "Step into an illustrated bay to explore how fishing pressure, ecosystem health and economic choices connect. A place to learn by exploring.",
    colour: "#e6cb88", location: null, zoom: 0, bearing: 0,
  },
};

export const mapCountryLabels: { name: string; location: [number, number] }[] = [
  { name: "SPAIN", location: [-3, 40.3] },
  { name: "FRANCE", location: [2.5, 46] },
  { name: "ITALY", location: [12.3, 43.1] },
  { name: "GREECE", location: [22.7, 39.4] },
  { name: "TÜRKIYE", location: [31, 39.4] },
  { name: "ALGERIA", location: [2, 32] },
  { name: "TUNISIA", location: [9.1, 34.1] },
  { name: "LIBYA", location: [18, 29.5] },
];
export const overviewBounds: [[number, number], [number, number]] = [[-6, 31], [32, 46.5]];

// Official FAO/GFCM source geometry lives in public/maps; this is presentation configuration.
export const aegeanStudyArea = {
  asset: "/maps/aegean-gsa-22-23.geojson",
  label: "Aegean study area · GSA 22 + 23",
  credit: "Boundaries: FAO/GFCM",
  source: "https://www.fao.org/gfcm/data/maps/geographical-subareas/en",
  bounds: [[22.53159, 34], [29, 41.09133]] as [[number, number], [number, number]],
};
