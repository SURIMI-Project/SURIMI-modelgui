import { simulationCaseStudies, type SimulationCaseId } from "../src/data/simulationCases";

export type DemoRunId = "1" | "2";
export type DemoScenarioRun = {
  key: string; id: DemoRunId; caseId: SimulationCaseId; name: string; createdAt: string; period: string;
};
const dates = {
  "anchovy-bay": ["2026-04-20T10:21:00Z", "2026-04-19T14:13:00Z"],
  "aegean-sea": ["2026-04-19T10:24:00Z", "2026-04-17T15:16:00Z"],
  "northwestern-mediterranean": ["2026-04-20T09:51:00Z", "2026-04-18T13:32:00Z"],
} as const;
const periods = { "anchovy-bay": "2006–2046", "aegean-sea": "2008–2048", "northwestern-mediterranean": "2007–2047" } as const;

// Explicit demo rows; never submitted or presented as backend experiments.
export const demoScenarioRuns: DemoScenarioRun[] = simulationCaseStudies.flatMap(study =>
  (["1", "2"] as const).map((id, index) => ({
    key: `${study.id}:${id}`, id, caseId: study.id, name: `Scenario ${id}`,
    createdAt: dates[study.id][index], period: periods[study.id],
  })),
);
