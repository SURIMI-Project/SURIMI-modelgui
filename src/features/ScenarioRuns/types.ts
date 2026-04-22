import type { SimulationCaseId } from "../../data/simulationCases";

export type ScenarioRunStatus = "draft" | "queued" | "running" | "completed" | "failed";

export type ScenarioRunInputDraft = {
  id?: string;
  speciesId?: string;
  speciesLabel?: string;
  durationYears?: number;
  ipccScenario?: string | null;
  harvestControlProfile?: string;
  createdAt?: string;
  completedAt?: string;
  name?: string;
};

export type ScenarioRunInputs = ScenarioRunInputDraft & {
  speciesId: string;
  speciesLabel: string;
  durationYears: number;
  harvestControlProfile: string;
};

export type ScenarioRun = {
  id: string;
  caseId: SimulationCaseId;
  title: string;
  status: ScenarioRunStatus;
  createdAt: string;
  completedAt?: string;
  inputs: ScenarioRunInputs;
  outputProfileId: string;
  summary: string;
};
