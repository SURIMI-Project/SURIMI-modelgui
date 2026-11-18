import { sampleOutput } from "../../../mock-data/sampleOutput";
import type { OutputSource } from "../../features/ScenarioOutputModal/netcdf/types";
import { useState } from "react";
import { Navigate, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { FiBarChart2 } from "react-icons/fi";
import Tag from "../../components/ui/Tag/Tag";
import Button from "../../components/ui/Button/Button";
import BackButton from "../../components/ui/BackButton/BackButton";
import Checkbox from "../../components/ui/Checkbox/Checkbox";
import Pagination from "../../components/ui/Pagination/Pagination";
import Tooltip, { TooltipTrigger } from "../../components/ui/Tooltip/Tooltip";
import Table, { TableHeader, Column, TableBody, Row, Cell } from "../../components/ui/Table/Table";
import { scenarioWorldContent } from "../../../mock-data/content/caseIntroductions";
import { getSimulationCaseById, normalizeSimulationCaseId, simulationCaseStudies } from "../../data/simulationCases";
import { useExperiments } from "../../serverState/experiments/useExperiments";
import { useExperimentEvents } from "../../serverState/events/useExperimentEvents";
import ScenarioOutputModal from "../../features/ScenarioOutputModal/ScenarioOutputModal";
import type { Experiment } from "../../network/services/experiments/experimentSchemas";
import { AppError } from "../../network/errors/appError";
import styles from "./ScenarioRunsPage.module.css";

const pageSizes = [20, 50, 100];
const dateFormatter = new Intl.DateTimeFormat("en", { dateStyle: "medium" });
const formatDate = (value: string | null) => {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : dateFormatter.format(date);
};
const statusLabels: Record<Experiment["status"], string> = {
  queued: "Queued", submitting: "Submitting", submit_failed: "Submission failed", submitted: "Submitted",
  initialising: "Initialising", initialised: "Initialised", running: "Running", copying_results: "Copying results",
  completed: "Completed", failed: "Failed", cancelling: "Cancelling", cancelled: "Cancelled",
};
const statusTone = (status: Experiment["status"]) => {
  if (status === "completed") return "success";
  if (status === "failed" || status === "submit_failed") return "danger";
  if (["running", "initialising", "copying_results"].includes(status)) return "secondary";
  return "neutral";
};
const listErrorMessage = (error: unknown) => {
  if (error instanceof AppError) {
    if (error.kind === "network") return "Could not reach SURIMI. Check your connection and try again.";
    if (error.kind === "forbidden") return "Your account cannot access these scenario runs.";
    if (error.kind === "invalidResponse") return "The scenario runs response could not be read. Please contact the team.";
    if (error.kind === "rateLimited") return "Too many requests. Wait before trying again.";
  }
  return "Could not load scenario runs. Please try again.";
};

export default function ScenarioRunsPage() {
  const navigate = useNavigate();
  const { caseId } = useParams();
  const [params, setParams] = useSearchParams();
  const selectedCase = normalizeSimulationCaseId(params.get("case"));
  const invalidCase = params.has("case") && !selectedCase;
  const study = getSimulationCaseById(selectedCase ?? undefined);
  const pageValue = Number(params.get("page") ?? 1);
  const page = Number.isSafeInteger(pageValue) && pageValue > 0 ? pageValue : 1;
  const sizeValue = Number(params.get("size") ?? 20);
  const pageSize = pageSizes.includes(sizeValue) ? sizeValue : 20;
  const experiments = useExperiments({ scenario: study?.scenarioName, page, size: pageSize, sort: "-created_at" }, !invalidCase && !caseId);
  const updates = useExperimentEvents(!invalidCase && !caseId);
  const outputRunId = params.get("run");
  const comparisonRunId = params.get("compare") ?? undefined;
  const outputOpen = params.has("run") || params.has("compare");
  const openOutput = (sources: OutputSource[]) => {
    const next = new URLSearchParams(params);
    next.set("run", sources[0].id);
    if (sources[1]) next.set("compare", sources[1].id);
    else next.delete("compare");
    setParams(next);
  };
  const closeOutput = () => {
    const next = new URLSearchParams(params);
    next.delete("run");
    next.delete("compare");
    setParams(next, { replace: true });
  };
  const [compared, setCompared] = useState<OutputSource[]>([]);
  const showSample = !invalidCase && page === 1 && (!study || study.scenarioName === sampleOutput.scenarioName);
  const selectedRuns = compared.filter(source => !study || source.scenarioName === study.scenarioName);
  const canCompare = (source: OutputSource) => selectedRuns.some(item => item.id === source.id)
    || (selectedRuns.length < 2 && (!selectedRuns.length || selectedRuns[0].scenarioName === source.scenarioName));
  const toggleCompare = (source: OutputSource) => setCompared(current => {
    const visible = current.filter(item => !study || item.scenarioName === study.scenarioName);
    return visible.some(item => item.id === source.id) ? visible.filter(item => item.id !== source.id)
      : visible.length < 2 && (!visible.length || visible[0].scenarioName === source.scenarioName) ? [...visible, source] : visible;
  });
  const title = `${selectedCase ? scenarioWorldContent[selectedCase].worldTitle : "All case studies"} scenario runs`;
  const runs = invalidCase ? [] : experiments.data?.items ?? [];
  const rows: Array<{ id: string; source: OutputSource; run?: Experiment }> = [
    ...(showSample ? [{ id: sampleOutput.id, source: sampleOutput }] : []),
    ...runs.map(run => ({ id: run.id, source: { id: run.id, name: run.name, scenarioName: run.scenario_name }, run })),
  ];
  const total = invalidCase ? 0 : experiments.data?.total ?? 0;
  const showPagination = total > 0;
  const showFooter = showPagination || (rows.length > 0 && (updates.isError || experiments.isError));
  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  if (caseId) {
    const next = new URLSearchParams(params);
    const normalized = normalizeSimulationCaseId(caseId);
    if (!normalized) return <Navigate to="/scenarios" replace />;
    next.set("case", normalized);
    return <Navigate to={`/scenario-runs?${next}`} replace />;
  }
  if (experiments.data && !experiments.isError && page > pageCount) {
    const next = new URLSearchParams(params);
    next.set("page", String(pageCount));
    return <Navigate to={`/scenario-runs?${next}`} replace />;
  }
  const setPagination = (nextPage: number, nextSize = pageSize) => {
    const next = new URLSearchParams(params);
    next.set("page", String(nextPage));
    next.set("size", String(nextSize));
    setParams(next);
  };
  const emptyMessage = invalidCase ? "Unknown case study. Return to case studies to choose a case."
    : experiments.isPending ? "Loading scenario runs…"
    : experiments.isError ? listErrorMessage(experiments.error)
    : "No scenario runs found.";

  return <section className={styles.page} aria-label={title}>
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.heading}>
          <BackButton aria-label="Back to case studies" onPress={() => navigate("/scenarios")} />
          <h1>{title}</h1>
        </div>
        <nav className={styles.actions} aria-label="Scenario runs actions">
          <Button variant="primary-outlined" isDisabled={selectedRuns.length !== 2} aria-description="Select two ready outputs from the same case study."
            onPress={() => { if (selectedRuns.length === 2) openOutput(selectedRuns); }}>COMPARE SELECTED</Button>
        </nav>
      </header>
      <div className={styles.tableRegion}>
        <Table className={styles.table} aria-label="Scenario runs" aria-busy={experiments.isFetching}>
          <TableHeader><Column isRowHeader>Simulation</Column><Column>Use case</Column><Column>Run ends</Column><Column>Created</Column><Column>Status</Column><Column>Results</Column><Column>Compare</Column></TableHeader>
          <TableBody dependencies={[selectedRuns]} items={invalidCase ? [] : rows} renderEmptyState={() => <div className={styles.emptyState} role={experiments.isError ? "alert" : "status"}>
            <p>{emptyMessage}</p>
            {experiments.isError && !invalidCase ? <Button variant="primary-outlined" size="sm" isDisabled={experiments.isFetching} onPress={() => { void experiments.refetch(); }}>TRY AGAIN</Button> : null}
          </div>}>{item => {
            const { run, source } = item;
            const ready = Boolean(source.sampleUrl || (run?.status === "completed" && run.outputs_state === "ready"));
            return <Row id={item.id}>
              <Cell><strong>{source.name}</strong>{source.sampleUrl ? <span> · Sample file</span> : null}</Cell>
              <Cell>{simulationCaseStudies.find(value => value.scenarioName === source.scenarioName)?.seaName ?? source.scenarioName}</Cell>
              <Cell>{run ? formatDate(run.end_date_time) : "From file"}</Cell><Cell>{run ? formatDate(run.created_at) : "—"}</Cell>
              <Cell><div className={styles.status}>
                <Tag dot tone={run ? statusTone(run.status) : "neutral"}>{run ? statusLabels[run.status] : "Sample data"}</Tag>
                {run?.progress != null ? <span>{Math.round(run.progress * 100)}%</span> : null}
                {run?.stalled ? <Tag tone="danger" title={run.stalled_reason ?? undefined}>Stalled</Tag> : null}
              </div></Cell>
              <Cell><TooltipTrigger>
                <Button variant="ghost" size="sm" iconOnly className={styles.resultsButton}
                  aria-label={`View results for ${source.name}`}
                  onPress={() => openOutput([source])}><FiBarChart2 aria-hidden="true" /></Button>
                <Tooltip>View results</Tooltip>
              </TooltipTrigger></Cell>
              <Cell><Checkbox aria-label={`Compare ${source.name}`} isSelected={selectedRuns.some(value => value.id === item.id)}
                isDisabled={!ready || !canCompare(source)} onChange={() => toggleCompare(source)} /></Cell>
            </Row>;
          }}</TableBody>
        </Table>
        {showFooter ? <footer className={styles.footer}>
          {updates.isError && !experiments.isError ? <p role="alert">Live updates are unavailable. <Button variant="ghost" size="sm" isDisabled={updates.isFetching}
            onPress={() => { void updates.refetch(); void experiments.refetch(); }}>TRY AGAIN</Button></p> : null}
          {experiments.isError && rows.length > 0 ? <p role="alert">{listErrorMessage(experiments.error)} <Button variant="ghost" size="sm" isDisabled={experiments.isFetching} onPress={() => { void experiments.refetch(); }}>TRY AGAIN</Button></p> : null}
          {showPagination ? <Pagination page={page} pageSize={pageSize} total={total} pageSizeOptions={pageSizes}
            isDisabled={experiments.isFetching || experiments.isError || invalidCase}
            onPageChange={next => setPagination(next)} onPageSizeChange={next => setPagination(1, next)} /> : null}
        </footer> : null}
      </div>
    </div>
    {outputOpen ? <ScenarioOutputModal key={`${outputRunId}:${comparisonRunId ?? ""}`} experimentId={outputRunId ?? ""} comparisonId={comparisonRunId} scenarioName={study?.scenarioName} isOpen onClose={closeOutput} /> : null}
  </section>;
}
