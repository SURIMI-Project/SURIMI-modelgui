import styles from "./ScenarioOutputsPage.module.css";
import { Navigate, useParams, useSearchParams } from "react-router-dom";
import ButtonLink from "../../components/ui/Button/ButtonLink";
import { normalizeSimulationCaseId } from "../../data/simulationCases";
import DemoScenarioOutputs from "../../features/ScenarioOutputs/DemoScenarioOutputs";
import { getDemoRunDataset } from "../../../mock-data/outputs/demoRuns";

export default function ScenarioOutputsPage() {
  const { scenario, caseId } = useParams();
  const [params] = useSearchParams();
  const requested = (scenario ?? caseId ?? "").toLowerCase();
  const normalized = normalizeSimulationCaseId(requested);
  if (!normalized) return <Navigate to="/scenarios" replace />;
  if (normalized !== requested) {
    return <Navigate to={`${scenario ? "/scenario-outputs" : "/outputs"}/${normalized}?${params}`} replace />;
  }
  const ids = params.getAll("run");
  const selected = ids.length ? ids : ["1"];
  const primary = getDemoRunDataset(normalized, selected[0]);
  const comparison = selected[1] ? getDemoRunDataset(normalized, selected[1]) : null;
  if (selected.length > 2 || new Set(selected).size !== selected.length || !primary || (selected.length === 2 && !comparison)) {
    return <section className={styles.emptyState} role="alert"><h1>Demo run unavailable</h1><p>Select Scenario 1 or Scenario 2 from the runs list.</p>
      <ButtonLink to={`/scenario-runs?case=${normalized}`}>Back to scenario runs</ButtonLink></section>;
  }
  return <DemoScenarioOutputs key={`${normalized}:${selected.join(":")}`} caseId={normalized}
    primaryDataset={primary} comparisonDataset={comparison ?? null} />;
}
