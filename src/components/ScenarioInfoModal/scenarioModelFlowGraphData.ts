export type ScenarioFlowNode = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fill: string;
  title: string;
  subtitle?: string;
};

export type ScenarioFlowEdgeLabel = {
  text: string;
  x: number;
  y: number;
  tone?: "default" | "muted";
};

export type ScenarioFlowEdge = {
  id: string;
  path: string;
  labels?: ScenarioFlowEdgeLabel[];
};

export const scenarioFlowNodes: ScenarioFlowNode[] = [
  {
    id: "poseidon",
    x: 185,
    y: 44,
    width: 400,
    height: 74,
    fill: "#f08a33",
    title: "POSEIDON",
    subtitle: "Spanish purse seiners and bottom trawlers",
  },
  {
    id: "cmsy",
    x: 0,
    y: 182,
    width: 160,
    height: 72,
    fill: "#7887d3",
    title: "CMSY++",
    subtitle: "Stock assessments",
  },
  {
    id: "market",
    x: 220,
    y: 182,
    width: 160,
    height: 72,
    fill: "#8d8f96",
    title: "Market",
    subtitle: "System Dynamics Model",
  },
  {
    id: "authority",
    x: 400,
    y: 182,
    width: 160,
    height: 72,
    fill: "#7ea7df",
    title: "Fisheries\nAuthority",
  },
  {
    id: "value-chain",
    x: 620,
    y: 182,
    width: 160,
    height: 72,
    fill: "#df766f",
    title: "Value Chain",
  },
  {
    id: "ecopath",
    x: 185,
    y: 314,
    width: 400,
    height: 78,
    fill: "#b8e35f",
    title: "Ecopath with Ecosim",
    subtitle: "Ecology. All other fleets",
  },
  {
    id: "environment",
    x: 185,
    y: 422,
    width: 400,
    height: 76,
    fill: "#68b8b4",
    title: "Environment",
  },
];

export const scenarioFlowEdges: ScenarioFlowEdge[] = [
  {
    id: "poseidon-to-cmsy",
    path: "M185 82 H80 V182",
    labels: [{ text: "Catches", x: 118, y: 76 }],
  },
  {
    id: "ecopath-to-poseidon",
    path: "M575 314 V118",
    labels: [{ text: "Biomass", x: 610, y: 300 }],
  },
  {
    id: "poseidon-to-ecopath",
    path: "M200 118 V314",
    labels: [{ text: "Catches", x: 168, y: 142, tone: "muted" }],
  },
  {
    id: "poseidon-to-market",
    path: "M276 118 V182",
    labels: [{ text: "Sales", x: 258, y: 142, tone: "muted" }],
  },
  {
    id: "market-to-poseidon",
    path: "M324 182 V118",
    labels: [{ text: "Prices", x: 348, y: 176, tone: "muted" }],
  },
  {
    id: "poseidon-to-authority",
    path: "M452 118 V182",
    labels: [{ text: "Catches and\nFishing activity", x: 396, y: 134 }],
  },
  {
    id: "authority-to-poseidon",
    path: "M500 182 V118",
    labels: [{ text: "Limits", x: 524, y: 166, tone: "muted" }],
  },
  {
    id: "poseidon-to-value-chain",
    path: "M585 82 H700 V182",
    labels: [{ text: "Sales", x: 646, y: 76 }],
  },
  {
    id: "ecopath-to-cmsy",
    path: "M185 368 H80 V254",
    labels: [{ text: "Biomass\nand catches", x: 58, y: 404 }],
  },
  {
    id: "ecopath-to-market",
    path: "M276 314 V254",
    labels: [{ text: "Sales", x: 246, y: 302 }],
  },
  {
    id: "market-to-ecopath",
    path: "M324 254 V314",
    labels: [{ text: "Prices", x: 348, y: 310, tone: "muted" }],
  },
  {
    id: "ecopath-to-authority",
    path: "M452 314 V254",
    labels: [
      { text: "Biomass, catches,\nand Fishing activity", x: 390, y: 268 },
    ],
  },
  {
    id: "authority-to-ecopath",
    path: "M500 254 V314",
    labels: [{ text: "Limits", x: 524, y: 294, tone: "muted" }],
  },
  {
    id: "ecopath-to-value-chain",
    path: "M585 354 H700 V254",
    labels: [
      { text: "Sales", x: 646, y: 368 },
      // { text: "Biomass", x: 668, y: 302, tone: "muted" },
    ],
  },
  {
    id: "environment-to-ecopath",
    path: "M385 422 V392",
    labels: [
      {
        text: "Oceanographic conditions",
        x: 470,
        y: 414,
        tone: "muted",
      },
    ],
  },
];
