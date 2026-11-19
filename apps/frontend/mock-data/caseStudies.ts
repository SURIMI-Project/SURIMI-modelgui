import type { SimulationCaseStudy } from "../src/data/simulationCases";

export const simulationCaseStudies: SimulationCaseStudy[] = [
  {
    id: "northwestern-mediterranean",
    scenarioName: "northwestern_med",
    seaName: "NORTHWESTERN MEDITERRANEAN SEA",
    subtitle: "Model covering areas GSA06 and GSA07",
    simulationTitle: "Northwestern Mediterranean Case Study",
    description:
      "Fisheries-related socioecological simulation modelling combination including representations of the marine ecology (EwE), maximum sustainable yield (CMSY++), fishing activities (POSEIDON and EwE), prices of caught species (Market model and Value chain).",
    videoSrc: "/1.mp4",
    playbackRate: 1,
  },
  {
    id: "aegean-sea",
    scenarioName: "aegean_sea",
    seaName: "AEGEAN SEA",
    subtitle: "Model covering areas GSA22 and GSA23",
    simulationTitle: "Aegean Sea Case Study",
    description:
      "This case study explores climate and fisheries management scenarios (various fishing effort changes) using representations of the marine ecology (EwE), maximum sustainable yield (CMSY++), fishing activities (MICE model/EwE), prices of caught species (Market model and Value chain).",
    videoSrc: "/2.mp4",
    playbackRate: 1,
  },
  {
    id: "anchovy-bay",
    scenarioName: "anchovy_bay",
    seaName: "ANCHOVY BAY",
    subtitle: "Educational Case Study",
    simulationTitle: "Anchovy Bay Case Study",
    description:
      "This case study focuses on fishing pressure, stock impact, and ecosystem tradeoffs and indicators under changing operational conditions.",
    videoSrc: "/3.mp4",
    playbackRate: 1,
  },
];

