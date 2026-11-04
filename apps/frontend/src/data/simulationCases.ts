export type SimulationCaseId =
  | "northwestern-mediterranean"
  | "aegean-sea"
  | "anchovy-bay";

export type LegacySimulationCaseId = "western-mediterranean";

export const normalizeSimulationCaseId = (
  caseId?: string | null,
): SimulationCaseId | null => {
  if (caseId === "western-mediterranean") {
    return "northwestern-mediterranean";
  }

  if (
    caseId === "northwestern-mediterranean" ||
    caseId === "aegean-sea" ||
    caseId === "anchovy-bay"
  ) {
    return caseId;
  }

  return null;
};

export type SimulationCaseStudy = {
  id: SimulationCaseId;
  /** Scenario name as returned by the controller's GetScenarioNames. */
  controllerScenarioName: string;
  seaName: string;
  subtitle: string;
  simulationTitle: string;
  description: string;
  videoSrc: string;
  playbackRate: number;
};

export const simulationCaseStudies: SimulationCaseStudy[] = [
  {
    id: "northwestern-mediterranean",
    controllerScenarioName: "northwestern_med",
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
    controllerScenarioName: "aegean_sea",
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
    controllerScenarioName: "anchovy_bay",
    seaName: "ANCHOVY BAY",
    subtitle: "Educational Case Study",
    simulationTitle: "Anchovy Bay Case Study",
    description:
      "This case study focuses on fishing pressure, stock impact, and ecosystem tradeoffs and indicators under changing operational conditions.",
    videoSrc: "/3.mp4",
    playbackRate: 1,
  },
];

export const getSimulationCaseById = (caseId?: string) => {
  const normalizedCaseId = normalizeSimulationCaseId(caseId);
  return simulationCaseStudies.find(
    (caseStudy) => caseStudy.id === normalizedCaseId,
  );
};
