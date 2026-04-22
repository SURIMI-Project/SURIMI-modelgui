import type { SimulationCaseId } from "../../data/simulationCases";
import type { ScenarioRun, ScenarioRunInputDraft } from "./types";

const DEFAULT_CREATED_AT = "2026-04-20T10:18:00Z";
const DEFAULT_COMPLETED_AT = "2026-04-20T10:21:00Z";
const userCreatedRuns = new Map<string, ScenarioRun>();

const getNumericRunId = (caseId: SimulationCaseId) => {
  const numericIds = [...seededRuns.values(), ...userCreatedRuns.values()]
    .filter((run) => run.caseId === caseId)
    .map((run) => Number.parseInt(run.id, 10))
    .filter((value) => Number.isFinite(value));

  return String((Math.max(0, ...numericIds) || 0) + 1);
};

const getAnchovyOutputProfileId = (durationYears: number, ipccScenario?: string | null) => {
  if (durationYears <= 10) {
    return "anchovy-near-term-hcr";
  }

  if (ipccScenario === "ssp5-8.5") {
    return "anchovy-long-run-high-emissions";
  }

  return "anchovy-long-run-managed-transition";
};

const getOutputProfileId = (
  caseId: SimulationCaseId,
  durationYears: number,
  ipccScenario?: string | null,
) => {
  if (caseId === "anchovy-bay") {
    return getAnchovyOutputProfileId(durationYears, ipccScenario);
  }

  if (durationYears <= 10) {
    return `${caseId}-near-term`;
  }

  if (ipccScenario === "ssp5-8.5" || ipccScenario === "ssp3-7.0") {
    return `${caseId}-high-pressure`;
  }

  return `${caseId}-managed-transition`;
};

const buildScenarioRunFromDraft = (
  caseId: SimulationCaseId,
  draft: ScenarioRunInputDraft,
): ScenarioRun => {
  const durationYears = draft.durationYears ?? 10;
  const speciesId = draft.speciesId ?? "anchovy";
  const speciesLabel = draft.speciesLabel ?? "Anchovy";
  const ipccScenario = durationYears > 10 ? draft.ipccScenario ?? "ssp2-4.5" : null;
  const id = draft.id ?? getNumericRunId(caseId);

  return {
    id,
    caseId,
    title: draft.name ?? `Scenario ${id}`,
    status: "completed",
    createdAt: draft.createdAt ?? DEFAULT_CREATED_AT,
    completedAt: draft.completedAt ?? DEFAULT_COMPLETED_AT,
    inputs: {
      speciesId,
      speciesLabel,
      durationYears,
      ipccScenario,
      harvestControlProfile: draft.harvestControlProfile ?? "Configured HCR curve",
    },
    outputProfileId: getOutputProfileId(caseId, durationYears, ipccScenario),
    summary:
      "The selected setup has been translated into a SURIMI scenario run and linked to a dashboard-ready output package.",
  };
};

export const createScenarioRunFromDraft = (
  caseId: SimulationCaseId,
  draft: ScenarioRunInputDraft,
): ScenarioRun => {
  const createdAt = draft.createdAt ?? new Date().toISOString();
  const run = buildScenarioRunFromDraft(caseId, {
    ...draft,
    createdAt,
    completedAt: draft.completedAt ?? createdAt,
  });
  userCreatedRuns.set(`${run.caseId}:${run.id}`, run);
  return run;
};

const seededRunsList: ScenarioRun[] = [
  buildScenarioRunFromDraft("anchovy-bay", {
    id: "1",
    name: "Scenario 1",
    speciesId: "anchovy",
    speciesLabel: "Anchovy",
    durationYears: 10,
    ipccScenario: null,
    createdAt: "2026-04-20T10:18:00Z",
    completedAt: "2026-04-20T10:21:00Z",
  }),
  buildScenarioRunFromDraft("anchovy-bay", {
    id: "2",
    name: "Scenario 2",
    speciesId: "anchovy",
    speciesLabel: "Anchovy",
    durationYears: 25,
    ipccScenario: "ssp2-4.5",
    createdAt: "2026-04-19T14:08:00Z",
    completedAt: "2026-04-19T14:13:00Z",
  }),
  buildScenarioRunFromDraft("northwestern-mediterranean", {
    id: "1",
    name: "Scenario 1",
    speciesId: "sardine",
    speciesLabel: "Sardine",
    durationYears: 25,
    ipccScenario: "ssp2-4.5",
    createdAt: "2026-04-20T09:44:00Z",
    completedAt: "2026-04-20T09:51:00Z",
  }),
  buildScenarioRunFromDraft("northwestern-mediterranean", {
    id: "2",
    name: "Scenario 2",
    speciesId: "hake",
    speciesLabel: "Hake",
    durationYears: 50,
    ipccScenario: "ssp3-7.0",
    createdAt: "2026-04-18T13:24:00Z",
    completedAt: "2026-04-18T13:32:00Z",
  }),
  buildScenarioRunFromDraft("aegean-sea", {
    id: "1",
    name: "Scenario 1",
    speciesId: "anchovy",
    speciesLabel: "Anchovy",
    durationYears: 25,
    ipccScenario: "ssp1-2.6",
    createdAt: "2026-04-19T10:18:00Z",
    completedAt: "2026-04-19T10:24:00Z",
  }),
  buildScenarioRunFromDraft("aegean-sea", {
    id: "2",
    name: "Scenario 2",
    speciesId: "hake",
    speciesLabel: "Hake",
    durationYears: 50,
    ipccScenario: "ssp5-8.5",
    createdAt: "2026-04-17T15:08:00Z",
    completedAt: "2026-04-17T15:16:00Z",
  }),
];

const seededRuns = new Map<string, ScenarioRun>(
  seededRunsList.map((run) => [`${run.caseId}:${run.id}`, run]),
);

export const getScenarioRunById = (
  caseId: SimulationCaseId,
  runId?: string,
): ScenarioRun | null => {
  if (!runId) {
    return null;
  }

  const seededRun = seededRuns.get(`${caseId}:${runId}`);
  const userCreatedRun = userCreatedRuns.get(`${caseId}:${runId}`);
  if (userCreatedRun) {
    return userCreatedRun;
  }

  if (seededRun) {
    return seededRun;
  }

  const legacyCaseId =
    caseId === "northwestern-mediterranean"
      ? "western-mediterranean"
      : caseId;

  if (
    /^\d+$/.test(runId) ||
    runId.startsWith(`${caseId}-demo-`) ||
    runId.startsWith(`${caseId}-`) ||
    runId.startsWith(`${legacyCaseId}-demo-`) ||
    runId.startsWith(`${legacyCaseId}-`)
  ) {
    const durationMatch = runId.match(/-(\d+)y-/);
    const durationYears = durationMatch ? Number(durationMatch[1]) : 10;
    const ipccScenario = runId.includes("ssp585")
      ? "ssp5-8.5"
      : runId.includes("ssp245")
        ? "ssp2-4.5"
        : runId.includes("ssp370")
          ? "ssp3-7.0"
          : runId.includes("ssp126")
            ? "ssp1-2.6"
        : null;

    return createScenarioRunFromDraft(caseId, {
      id: /^\d+$/.test(runId) ? runId : undefined,
      speciesId: "anchovy",
      speciesLabel: "Anchovy",
      durationYears,
      ipccScenario,
    });
  }

  return null;
};

export const getScenarioRunsByCaseId = (
  caseId: SimulationCaseId,
  activeRunId?: string,
): ScenarioRun[] => {
  const runsById = new Map<string, ScenarioRun>();
  [...seededRuns.values(), ...userCreatedRuns.values()].forEach((run) => {
    runsById.set(`${run.caseId}:${run.id}`, run);
  });

  const runs = [...runsById.values()]
    .filter((run) => run.caseId === caseId)
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));

  const activeRun = getScenarioRunById(caseId, activeRunId);
  if (!activeRun) {
    return runs;
  }

  return [activeRun, ...runs.filter((run) => run.id !== activeRun.id)];
};
