import { useState } from "react";
import { Navigate, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { FiArrowRight, FiPlus } from "react-icons/fi";
import Button from "../../components/ui/Button/Button";
import Table, { TableHeader, Column, TableBody, Row, Cell } from "../../components/ui/Table/Table";
import Modal from "../../components/ui/Modal/Modal";
import { exampleSimulation } from "../../../mock-data/simulation";
import { getScenarioWorldConfig } from "../../constants/scenarioWorldConfig";
import { normalizeSimulationCaseId, simulationCaseStudies, type SimulationCaseId } from "../../data/simulationCases";
import styles from "./ScenarioRunsPage.module.css";

export default function ScenarioRunsPage() {
  const navigate = useNavigate();
  const { caseId } = useParams();
  const [params, setParams] = useSearchParams();
  const selectedCase = normalizeSimulationCaseId(params.get("case"));
  const [setupOpen, setSetupOpen] = useState(false);
  const [setupCase, setSetupCase] = useState<SimulationCaseId | null>(null);
  const cases = simulationCaseStudies.filter(item => !selectedCase || item.id === selectedCase);
  const Inputs = setupCase ? getScenarioWorldConfig(setupCase).CreateSimulationModalComponent : undefined;
  if (caseId) {
    const next = new URLSearchParams(params);
    const normalized = normalizeSimulationCaseId(caseId);
    if (normalized) next.set("case", normalized);
    return <Navigate to={`/scenario-runs${next.size ? `?${next}` : ""}`} replace />;
  }
  return <section className={styles.page} aria-label="Scenario runs">
    <div className={styles.container}>
      <header className={styles.header}><h1>Scenario runs <span>{cases.length}</span></h1><Button variant="primary" onPress={() => { setSetupCase(selectedCase); setSetupOpen(true); }}><FiPlus aria-hidden="true" />Set Up Scenario</Button></header>
      <div className={styles.tableRegion}>
        <Table className={styles.table} aria-label="Example simulations by use case">
          <TableHeader><Column isRowHeader>Simulation</Column><Column>Use case</Column><Column>Period</Column><Column>Example date</Column><Column>Status</Column><Column>Results</Column></TableHeader>
          <TableBody items={cases}>{item => <Row id={item.id}><Cell><strong>{exampleSimulation.title}</strong></Cell><Cell>{item.simulationTitle}</Cell><Cell>{exampleSimulation.period}</Cell><Cell>{new Intl.DateTimeFormat("en", {dateStyle: "medium", timeZone: "UTC"}).format(new Date(exampleSimulation.createdAt))}</Cell><Cell><span className={styles.badge}>{exampleSimulation.status}</span></Cell><Cell><Button variant="primary-outlined" size="sm" aria-label={`View ${item.simulationTitle} example results`} onPress={() => navigate(`/scenario-outputs/${item.id}`)}>View results<FiArrowRight aria-hidden="true" /></Button></Cell></Row>}</TableBody>
        </Table>
        <footer className={styles.footer}>1 shared example report · {cases.length} use {cases.length === 1 ? "case" : "cases"}</footer>
      </div>
    </div>
    <Modal opened={setupOpen && !setupCase} onClose={() => setSetupOpen(false)} title="Create simulation" size={640}>
      <div className={styles.casePicker}><p>Choose a use case to configure its simulation inputs.</p>{simulationCaseStudies.map(item => <Button key={item.id} variant="primary-outlined" onPress={() => setSetupCase(item.id)}>{item.simulationTitle}<FiArrowRight aria-hidden="true" /></Button>)}</div>
    </Modal>
    {Inputs ? <Inputs key={setupCase} isOpen={setupOpen} onClose={() => setSetupOpen(false)} onComplete={() => { setSetupOpen(false); const next = new URLSearchParams(params); next.set("case", setupCase!); setParams(next); }} /> : null}
  </section>;
}
