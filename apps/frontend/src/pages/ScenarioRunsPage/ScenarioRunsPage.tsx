import { useState } from "react";
import { Navigate, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { FiArrowLeft, FiArrowRight, FiPlus } from "react-icons/fi";
import Tag from "../../components/ui/Tag/Tag";
import Button from "../../components/ui/Button/Button";
import Table, { TableHeader, Column, TableBody, Row, Cell } from "../../components/ui/Table/Table";
import { scenarioWorldContent } from "../../../mock-data/content/caseIntroductions";
import { exampleSimulation } from "../../../mock-data/simulation";
import { getScenarioWorldConfig } from "../../constants/scenarioWorldConfig";
import { normalizeSimulationCaseId, simulationCaseStudies } from "../../data/simulationCases";
import styles from "./ScenarioRunsPage.module.css";

export default function ScenarioRunsPage() {
  const navigate = useNavigate();
  const { caseId } = useParams();
  const [params, setParams] = useSearchParams();
  const selectedCase = normalizeSimulationCaseId(params.get("case"));
  const [setupOpen, setSetupOpen] = useState(false);
  const title = `${selectedCase ? scenarioWorldContent[selectedCase].worldTitle : "All case studies"} scenario runs`;
  const cases = simulationCaseStudies.filter(item => !selectedCase || item.id === selectedCase);
  const Inputs = selectedCase ? getScenarioWorldConfig(selectedCase).CreateSimulationModalComponent : undefined;
  if (caseId) {
    const next = new URLSearchParams(params);
    const normalized = normalizeSimulationCaseId(caseId);
    if (normalized) next.set("case", normalized);
    return <Navigate to={`/scenario-runs${next.size ? `?${next}` : ""}`} replace />;
  }
  return <section className={styles.page} aria-label={title}>
    <div className={styles.container}>
      <header className={styles.header}>
        <h1>{title}</h1>
        <nav className={styles.actions} aria-label="Scenario runs actions">
          <Button variant="primary-outlined" onPress={() => navigate("/scenarios")}><FiArrowLeft aria-hidden="true" />Back to case studies</Button>
          {selectedCase ? <Button variant="primary" onPress={() => setSetupOpen(true)}><FiPlus aria-hidden="true" />Set Up Scenario</Button> : null}
        </nav>
      </header>
      <div className={styles.tableRegion}>
        <Table className={styles.table} aria-label="Example simulations by use case">
          <TableHeader><Column isRowHeader>Simulation</Column><Column>Use case</Column><Column>Period</Column><Column>Example date</Column><Column>Status</Column><Column>Results</Column></TableHeader>
          <TableBody items={cases}>{item => <Row id={item.id}><Cell><strong>{exampleSimulation.title}</strong></Cell><Cell>{item.simulationTitle}</Cell><Cell>{exampleSimulation.period}</Cell><Cell>{new Intl.DateTimeFormat("en", {dateStyle: "medium", timeZone: "UTC"}).format(new Date(exampleSimulation.createdAt))}</Cell><Cell><Tag dot>{exampleSimulation.status}</Tag></Cell><Cell><Button variant="primary-outlined" size="sm" aria-label={`View ${item.simulationTitle} example results`} onPress={() => navigate(`/scenario-outputs/${item.id}`)}>View results<FiArrowRight aria-hidden="true" /></Button></Cell></Row>}</TableBody>
        </Table>
        <footer className={styles.footer}>1 shared example report · {cases.length} use {cases.length === 1 ? "case" : "cases"}</footer>
      </div>
    </div>
    {Inputs ? <Inputs key={selectedCase} isOpen={setupOpen} onClose={() => setSetupOpen(false)} onComplete={() => { setSetupOpen(false); const next = new URLSearchParams(params); next.set("case", selectedCase!); setParams(next); }} /> : null}
  </section>;
}
