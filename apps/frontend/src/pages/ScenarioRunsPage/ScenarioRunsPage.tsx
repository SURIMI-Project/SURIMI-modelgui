import { Button, ScrollArea } from "@mantine/core";
import { useState, type CSSProperties } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import {
  FiAnchor,
  FiArrowLeft,
  FiCheckCircle,
  FiCompass,
  FiEye,
  FiNavigation,
  FiPlus,
} from "react-icons/fi";
import { exampleSimulation } from "../../../mock-data/simulation";
import { getScenarioWorldConfig } from "../../constants/scenarioWorldConfig";
import {
  getSimulationCaseById,
  normalizeSimulationCaseId,
  simulationCaseStudies,
  type SimulationCaseId,
} from "../../data/simulationCases";
import { useScenarioSetupCompletion } from "../../features/ScenarioRuns/useScenarioSetupCompletion";
import smallSurimiLogo from "../../assets/smallSurimiLogo.png";
import styles from "./ScenarioRunsPage.module.css";

const scenarioNavIcons = {
  "anchovy-bay": FiAnchor,
  "aegean-sea": FiCompass,
  "northwestern-mediterranean": FiNavigation,
} satisfies Record<SimulationCaseId, typeof FiAnchor>;

const ScenarioRunsPage = () => {
  const navigate = useNavigate();
  const { caseId } = useParams<{ caseId?: string }>();
  const selectedCaseId = normalizeSimulationCaseId(caseId);
  const [isScenarioInputsOpen, setIsScenarioInputsOpen] = useState(false);
  const { completeScenarioSetup } = useScenarioSetupCompletion({
    caseId: selectedCaseId ?? "anchovy-bay",
    onSetupStarted: () => setIsScenarioInputsOpen(false),
  });

  if (!selectedCaseId) {
    return <Navigate to="/scenario-runs/anchovy-bay" replace />;
  }
  if (caseId !== selectedCaseId) {
    return <Navigate to={`/scenario-runs/${selectedCaseId}`} replace />;
  }

  const caseStudy = getSimulationCaseById(selectedCaseId)!;
  const worldConfig = getScenarioWorldConfig(selectedCaseId);
  const InputsFlowComponent = worldConfig.InputsFlowComponent;
  const backToCases = () => navigate("/", { state: { fromWorld: true } });
  const worldVariables = {
    "--runs-accent": worldConfig.accentColor,
    "--runs-secondary": worldConfig.secondaryColor,
    "--runs-bg-top": worldConfig.backgroundTopColor,
    "--runs-bg-bottom": worldConfig.backgroundBottomColor,
  } as CSSProperties;

  return (
    <main className={styles.page} style={worldVariables}>
      <aside className={styles.sidebar} aria-label="Scenario navigation">
        <button
          type="button"
          className={styles.logoButton}
          onClick={backToCases}
          aria-label="Back to case studies"
        >
          <img src={smallSurimiLogo} alt="SURIMI" className={styles.logoImage} />
        </button>
        <nav className={styles.scenarioNav}>
          {simulationCaseStudies.map((item) => {
            const Icon = scenarioNavIcons[item.id];
            return (
              <button
                key={item.id}
                type="button"
                className={[
                  styles.scenarioNavItem,
                  item.id === selectedCaseId ? styles.scenarioNavItemActive : "",
                ].join(" ")}
                onClick={() => navigate(`/scenario-runs/${item.id}`)}
              >
                <span
                  className={styles.scenarioImageSlot}
                  data-case={item.id}
                  aria-hidden="true"
                >
                  <Icon />
                </span>
                <span className={styles.scenarioNavCopy}>
                  <strong>{item.simulationTitle}</strong>
                  <small>1 example simulation</small>
                </span>
              </button>
            );
          })}
        </nav>
      </aside>
      <section className={styles.workspace}>
        <header className={styles.topbar}>
          <div className={styles.topbarTitle}>
            <Button
              variant="primaryOutlined"
              leftSection={<FiArrowLeft size={16} />}
              onClick={backToCases}
            >
              Back To Case Studies
            </Button>
            <div>
              <p>Demo scenario library</p>
              <h1>{caseStudy.simulationTitle}</h1>
            </div>
          </div>
          <div className={styles.topbarActions}>
            <Button
              variant="primaryOutlined"
              disabled
              title="Only one example simulation is available"
            >
              Compare Selected
            </Button>
            <Button
              variant="primaryFilled"
              leftSection={<FiPlus size={16} />}
              onClick={() => setIsScenarioInputsOpen(true)}
            >
              Set Up Scenario
            </Button>
          </div>
        </header>
        <p role="note">{exampleSimulation.description}</p>
        <section className={styles.panel}>
          <ScrollArea
            className={styles.tableShell}
            type="auto"
            offsetScrollbars
            scrollbarSize={8}
          >
            <table className={styles.runsTable}>
              <thead>
                <tr>
                  <th>Inputs</th>
                  <th>Name</th>
                  <th>Example date</th>
                  <th>Status</th>
                  <th>Dashboard</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>{exampleSimulation.period}</td>
                  <td>{exampleSimulation.title}</td>
                  <td className={styles.dateCell}>
                    {new Intl.DateTimeFormat("en", {
                      dateStyle: "medium",
                      timeZone: "UTC",
                    }).format(new Date(exampleSimulation.createdAt))}
                  </td>
                  <td>
                    <span className={styles.statusPill} data-tone="done">
                      <FiCheckCircle aria-hidden="true" />
                      {exampleSimulation.status}
                    </span>
                  </td>
                  <td>
                    <button
                      type="button"
                      className={styles.reportButton}
                      onClick={() => navigate(`/scenario-outputs/${selectedCaseId}`)}
                      aria-label="Open example simulation dashboard"
                    >
                      <FiEye aria-hidden="true" />
                      <span>View</span>
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </ScrollArea>
          <footer className={styles.paginationBar}>
            <span>Showing 1 shared example simulation</span>
          </footer>
        </section>
      </section>
      {InputsFlowComponent ? (
        <InputsFlowComponent
          isOpen={isScenarioInputsOpen}
          onClose={() => setIsScenarioInputsOpen(false)}
          onComplete={completeScenarioSetup}
        />
      ) : null}
    </main>
  );
};

export default ScenarioRunsPage;
