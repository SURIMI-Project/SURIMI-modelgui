import { useState } from "react";
import { Navigate, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { FiArrowLeft, FiArrowRight, FiPlus } from "react-icons/fi";
import Tag from "../../components/ui/Tag/Tag";
import Button from "../../components/ui/Button/Button";
import Checkbox from "../../components/ui/Checkbox/Checkbox";
import Pagination from "../../components/ui/Pagination/Pagination";
import Table, { TableHeader, Column, TableBody, Row, Cell } from "../../components/ui/Table/Table";
import { scenarioWorldContent } from "../../../mock-data/content/caseIntroductions";
import { getScenarioWorldConfig } from "../../constants/scenarioWorldConfig";
import { getSimulationCaseById, normalizeSimulationCaseId, simulationCaseStudies } from "../../data/simulationCases";
import { useExperiments } from "../../serverState/experiments/useExperiments";
import type { Experiment } from "../../network/services/experiments/experimentSchemas";
import { AppError } from "../../network/errors/appError";
import styles from "./ScenarioRunsPage.module.css";

const pageSizes = [10, 20, 50, 100];
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
  const size = pageSizes.includes(sizeValue) ? sizeValue : 20;
  const experiments = useExperiments({ scenario: study?.scenarioName, page, size, sort: "-created_at" }, !invalidCase && !caseId);
  const [setupOpen, setSetupOpen] = useState(false);
  const title = `${selectedCase ? scenarioWorldContent[selectedCase].worldTitle : "All case studies"} scenario runs`;
  const Inputs = selectedCase ? getScenarioWorldConfig(selectedCase).CreateSimulationModalComponent : undefined;
  const runs = invalidCase ? [] : experiments.data?.items ?? [];
  const total = invalidCase ? 0 : experiments.data?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / size));

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
  const setPagination = (nextPage: number, nextSize = size) => {
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
        <h1>{title}</h1>
        <nav className={styles.actions} aria-label="Scenario runs actions">
          <Button variant="ghost" onPress={() => navigate("/scenarios")}><FiArrowLeft aria-hidden="true" />Back to case studies</Button>
          <Button variant="primary-outlined" isDisabled aria-description="Comparison is not available on this screen yet.">COMPARE SELECTED</Button>
          {selectedCase ? <Button onPress={() => setSetupOpen(true)}><FiPlus aria-hidden="true" />SET UP SCENARIO</Button> : null}
        </nav>
      </header>
      <div className={styles.tableRegion}>
        <Table className={styles.table} aria-label="Scenario runs" aria-busy={experiments.isFetching}>
          <TableHeader><Column>Compare</Column><Column isRowHeader>Simulation</Column><Column>Use case</Column><Column>Run ends</Column><Column>Created</Column><Column>Status</Column><Column>Results</Column></TableHeader>
          <TableBody items={invalidCase ? [] : runs} renderEmptyState={() => <div className={styles.emptyState} role={experiments.isError ? "alert" : "status"}>
            <p>{emptyMessage}</p>
            {experiments.isError && !invalidCase ? <Button variant="primary-outlined" size="sm" isDisabled={experiments.isFetching} onPress={() => { void experiments.refetch(); }}>TRY AGAIN</Button> : null}
          </div>}>{run => <Row id={run.id}>
            <Cell><Checkbox aria-label={`Compare ${run.name}`} isDisabled /></Cell>
            <Cell><strong>{run.name}</strong></Cell>
            <Cell>{simulationCaseStudies.find(item => item.scenarioName === run.scenario_name)?.seaName ?? run.scenario_name}</Cell>
            <Cell>{formatDate(run.end_date_time)}</Cell><Cell>{formatDate(run.created_at)}</Cell>
            <Cell><div className={styles.status}>
              <Tag dot tone={statusTone(run.status)}>{statusLabels[run.status]}</Tag>
              {run.progress !== null ? <span>{Math.round(run.progress * 100)}%</span> : null}
              {run.stalled ? <Tag tone="danger" title={run.stalled_reason ?? undefined}>Stalled</Tag> : null}
            </div></Cell>
            <Cell><Button variant="primary-outlined" size="sm" isDisabled aria-description="Results are not available on this screen yet.">VIEW RESULTS<FiArrowRight aria-hidden="true" /></Button></Cell>
          </Row>}</TableBody>
        </Table>
        <footer className={styles.footer}>
          {experiments.isError && runs.length > 0 ? <p role="alert">{listErrorMessage(experiments.error)} <Button variant="ghost" size="sm" isDisabled={experiments.isFetching} onPress={() => { void experiments.refetch(); }}>TRY AGAIN</Button></p> : null}
          <Pagination page={page} pageSize={size} total={total} pageSizeOptions={pageSizes}
            isDisabled={experiments.isFetching || experiments.isError || invalidCase}
            onPageChange={next => setPagination(next)} onPageSizeChange={next => setPagination(1, next)} />
        </footer>
      </div>
    </div>
    {Inputs ? <Inputs key={selectedCase} isOpen={setupOpen} onClose={() => setSetupOpen(false)} onComplete={() => { setSetupOpen(false); }} /> : null}
  </section>;
}
