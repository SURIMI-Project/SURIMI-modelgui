import { useState } from "react";
import { Navigate, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { FiArrowLeft, FiArrowRight, FiPlus } from "react-icons/fi";
import Tag from "../../components/ui/Tag/Tag";
import Button from "../../components/ui/Button/Button";
import Checkbox from "../../components/ui/Checkbox/Checkbox";
import Table, { TableHeader, Column, TableBody, Row, Cell } from "../../components/ui/Table/Table";
import { scenarioWorldContent } from "../../../mock-data/content/caseIntroductions";
import { demoScenarioRuns } from "../../../mock-data/scenarioRuns";
import { getScenarioWorldConfig } from "../../constants/scenarioWorldConfig";
import { normalizeSimulationCaseId } from "../../data/simulationCases";
import styles from "./ScenarioRunsPage.module.css";

export default function ScenarioRunsPage() {
  const navigate = useNavigate();
  const { caseId } = useParams();
  const [params, setParams] = useSearchParams();
  const selectedCase = normalizeSimulationCaseId(params.get("case"));
  const [setupOpen, setSetupOpen] = useState(false);
  const [selection, setSelection] = useState<{ caseFilter: string | null; ids: string[] }>({ caseFilter: selectedCase, ids: [] });
  const selectedIds = selection.caseFilter === selectedCase ? selection.ids : [];
  const selectedRuns = demoScenarioRuns.filter(run => selectedIds.includes(run.key));
  const comparisonCase = selectedRuns[0]?.caseId;
  const canCompare = selectedRuns.length === 2 && selectedRuns.every(run => run.caseId === comparisonCase);
  const title = `${selectedCase ? scenarioWorldContent[selectedCase].worldTitle : "All case studies"} scenario runs`;
  const runs = demoScenarioRuns.filter(run => !selectedCase || run.caseId === selectedCase);
  const Inputs = selectedCase ? getScenarioWorldConfig(selectedCase).CreateSimulationModalComponent : undefined;
  if (caseId) {
    const next = new URLSearchParams(params);
    const normalized = normalizeSimulationCaseId(caseId);
    if (normalized) next.set("case", normalized);
    return <Navigate to={`/scenario-runs${next.size ? `?${next}` : ""}`} replace />;
  }
  const toggleRunSelection = (key: string, checked: boolean) => {
    setSelection(current => {
      const ids = current.caseFilter === selectedCase ? current.ids : [];
      return {
        caseFilter: selectedCase,
        ids: checked ? [...ids.filter(id => id !== key), key].slice(-2) : ids.filter(id => id !== key),
      };
    });
  };
  const compare = () => {
    if (!canCompare) return;
    const query = new URLSearchParams();
    selectedRuns.forEach(run => query.append("run", run.id));
    navigate(`/scenario-outputs/${comparisonCase}?${query}`);
  };
  return <section className={styles.page} aria-label={title}>
    <div className={styles.container}>
      <header className={styles.header}>
        <h1>{title}</h1>
        <nav className={styles.actions} aria-label="Scenario runs actions">
          <Button variant="ghost" onPress={() => navigate("/scenarios")}><FiArrowLeft aria-hidden="true" />Back to case studies</Button>
          <Button variant="primary-outlined" isDisabled={!canCompare} onPress={compare}>COMPARE SELECTED</Button>
          {selectedCase ? <Button onPress={() => setSetupOpen(true)}><FiPlus aria-hidden="true" />SET UP SCENARIO</Button> : null}
        </nav>
      </header>
      <div className={styles.tableRegion}>
        <Table className={styles.table} aria-label="Demo scenario runs">
          <TableHeader><Column>Compare</Column><Column isRowHeader>Simulation</Column><Column>Use case</Column><Column>Period</Column><Column>Example date</Column><Column>Status</Column><Column>Results</Column></TableHeader>
          <TableBody items={runs} dependencies={[selection, selectedCase]}>{run => <Row id={run.key}>
            <Cell><Checkbox aria-label={`Select ${run.name}, ${scenarioWorldContent[run.caseId].worldTitle}, for comparison`}
              isSelected={selectedIds.includes(run.key)} isDisabled={Boolean(comparisonCase && comparisonCase !== run.caseId)}
              onChange={checked => toggleRunSelection(run.key, checked)} /></Cell>
            <Cell><strong>{run.name}</strong></Cell><Cell>{scenarioWorldContent[run.caseId].worldTitle}</Cell><Cell>{run.period}</Cell>
            <Cell>{new Intl.DateTimeFormat("en", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(run.createdAt))}</Cell>
            <Cell><Tag dot>Demo results</Tag></Cell>
            <Cell><Button variant="primary-outlined" size="sm" aria-label={`View ${run.name}, ${scenarioWorldContent[run.caseId].worldTitle}`} onPress={() => navigate(`/scenario-outputs/${run.caseId}?run=${run.id}`)}>VIEW RESULTS<FiArrowRight aria-hidden="true" /></Button></Cell>
          </Row>}</TableBody>
        </Table>
        <footer className={styles.footer} aria-live="polite">{runs.length} demo runs · {selectedRuns.length} selected · Select two runs from the same case study.</footer>
      </div>
    </div>
    {Inputs ? <Inputs key={selectedCase} isOpen={setupOpen} onClose={() => setSetupOpen(false)} onComplete={() => { setSetupOpen(false); const next = new URLSearchParams(params); next.set("case", selectedCase!); setParams(next); }} /> : null}
  </section>;
}
