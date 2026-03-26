export type SimulationCaseId =
  | "western-mediterranean"
  | "aegean-sea"
  | "anchovy-bay";

export type SimulationCaseStudy = {
  id: SimulationCaseId;
  seaName: string;
  subtitle: string;
  simulationTitle: string;
  description: string;
  videoSrc: string;
  playbackRate: number;
};

export const simulationCaseStudies: SimulationCaseStudy[] = [
  {
    id: "western-mediterranean",
    seaName: "Western Mediterranean Sea",
    subtitle: "Large-scale maritime traffic and emissions modelling",
    simulationTitle: "Western Mediterranean Scenario",
    description:
      "This case study models high-density vessel corridors and regional emissions across a broad western Mediterranean operating envelope.",
    videoSrc: "/1.mp4",
    playbackRate: 1,
  },
  {
    id: "aegean-sea",
    seaName: "Aegean Sea",
    subtitle: "Port connectivity and coastal impact scenario",
    simulationTitle: "Aegean Sea Scenario",
    description:
      "This case study explores maritime traffic patterns and environmental emissions across the Aegean Sea using port and vessel activity data.",
    videoSrc: "/2.mp4",
    playbackRate: 1,
  },
  {
    id: "anchovy-bay",
    seaName: "Anchovy Bay",
    subtitle: "Demo model used for educational purposes",
    simulationTitle: "Anchovy Bay Scenario",
    description:
      "This case study focuses on fisheries pressure, biomass sensitivity, and ecosystem indicators under changing operational conditions.",
    videoSrc: "/3.mp4",
    playbackRate: 1,
  },
];

export const getSimulationCaseById = (caseId?: string) => {
  return simulationCaseStudies.find((caseStudy) => caseStudy.id === caseId);
};
