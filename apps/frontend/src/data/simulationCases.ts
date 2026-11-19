import { simulationCaseStudies } from "../../mock-data/caseStudies";
export { simulationCaseStudies } from "../../mock-data/caseStudies";

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
  /** Backend scenario identifier used to match the REST availability response. */
  scenarioName: string;
  seaName: string;
  subtitle: string;
  simulationTitle: string;
  description: string;
  videoSrc: string;
  playbackRate: number;
};


export const getSimulationCaseById = (caseId?: string) => {
  const normalizedCaseId = normalizeSimulationCaseId(caseId);
  return simulationCaseStudies.find(
    (caseStudy) => caseStudy.id === normalizedCaseId,
  );
};
