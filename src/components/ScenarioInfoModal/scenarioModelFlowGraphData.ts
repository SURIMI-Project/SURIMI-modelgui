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
    id: "environment-to-ecopath",
    path: "M385 498 V428",
  },
];
