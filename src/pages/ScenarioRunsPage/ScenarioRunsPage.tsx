import { Button, Pagination, ScrollArea } from "@mantine/core";
import { useEffect, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { FiArrowLeft, FiCheckCircle, FiEye, FiPlus } from "react-icons/fi";
import { getScenarioWorldConfig } from "../../constants/scenarioWorldConfig";
import {
  getSimulationCaseById,
  normalizeSimulationCaseId,
  simulationCaseStudies,
  type SimulationCaseId,
} from "../../data/simulationCases";
import {
  getScenarioRunById,
  getScenarioRunsByCaseId,
} from "../../features/ScenarioRuns/mockScenarioRuns";
import ScenarioSetupLoadingOverlay from "../../features/ScenarioRuns/ScenarioSetupLoadingOverlay";
import type { ScenarioRun } from "../../features/ScenarioRuns/types";
import { useScenarioSetupCompletion } from "../../features/ScenarioRuns/useScenarioSetupCompletion";
import smallSurimiLogo from "../../assets/smallSurimiLogo.png";
import styles from "./ScenarioRunsPage.module.css";

const PAGE_SIZE = 6;
const scenarioNavImages = {
  "anchovy-bay": "/sidemenu/anchovyItem.jpg",
  "aegean-sea": "/sidemenu/aegeanItem.jpg",
  "northwestern-mediterranean": "/sidemenu/northwesternseaItem.jpg",
} satisfies Record<SimulationCaseId, string>;

const formatDateTime = (value: string) => {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
};

const getRunName = (run: ScenarioRun) => {
  const climate = run.inputs.ipccScenario ?? "default";
  return `${run.inputs.speciesLabel} · ${run.inputs.durationYears}y · ${climate}`;
};

const getIpccLabel = (run: ScenarioRun) => {
  return run.inputs.ipccScenario ?? "Default IPCC scenario";
};

const getCaseLabel = (caseId: SimulationCaseId) => {
  const caseStudy = getSimulationCaseById(caseId);
  return caseStudy?.seaName
    .replace("NORTHWESTERN MEDITERRANEAN SEA", "Northwestern Mediterranean")
    .replace("AEGEAN SEA", "Aegean Sea")
    .replace("ANCHOVY BAY", "Anchovy Bay");
};

const ScenarioRunsPage = () => {
  const navigate = useNavigate();
  const { caseId, runId } = useParams<{ caseId?: string; runId?: string }>();
  const normalizedCaseId = normalizeSimulationCaseId(caseId);
  const selectedCaseId = normalizedCaseId ?? "anchovy-bay";
  const [activePage, setActivePage] = useState(1);
  const [isScenarioInputsOpen, setIsScenarioInputsOpen] = useState(false);
  const { completeScenarioSetup, isScenarioSetupLoading } =
    useScenarioSetupCompletion({
      caseId: selectedCaseId,
      onSetupStarted: () => {
        setIsScenarioInputsOpen(false);
        setActivePage(1);
      },
    });

  useEffect(() => {
    setActivePage(1);
  }, [caseId]);

  if (!normalizedCaseId) {
    return <Navigate to="/scenario-runs/anchovy-bay" replace />;
  }

  if (caseId !== normalizedCaseId) {
    return (
      <Navigate
        to={
          runId
            ? `/scenario-runs/${normalizedCaseId}/${runId}`
            : `/scenario-runs/${normalizedCaseId}`
        }
        replace
      />
    );
  }

  const caseStudy = getSimulationCaseById(selectedCaseId);
  const worldConfig = getScenarioWorldConfig(selectedCaseId);
  const activeRun = getScenarioRunById(selectedCaseId, runId);
  const runs = getScenarioRunsByCaseId(selectedCaseId, runId);
  const InputsFlowComponent = worldConfig.InputsFlowComponent;

  if (!caseStudy || runs.length === 0) {
    return <Navigate to="/" replace />;
  }

  const totalPages = Math.max(1, Math.ceil(runs.length / PAGE_SIZE));
  const safeActivePage = Math.min(activePage, totalPages);
  const startIndex = (safeActivePage - 1) * PAGE_SIZE;
  const visibleRuns = runs.slice(startIndex, startIndex + PAGE_SIZE);

  const openDashboard = (id: string) => {
    navigate(
      `/scenario-outputs/${selectedCaseId}?run=${encodeURIComponent(id)}`,
    );
  };

  return (
    <main
      className={styles.page}
      style={
        {
          "--runs-accent": worldConfig.accentColor,
          "--runs-secondary": worldConfig.secondaryColor,
          "--runs-bg-top": worldConfig.backgroundTopColor,
          "--runs-bg-bottom": worldConfig.backgroundBottomColor,
        } as React.CSSProperties
      }
    >
      <aside className={styles.sidebar} aria-label="Scenario navigation">
        <button
          type="button"
          className={styles.logoButton}
          onClick={() => {
            navigate("/", { state: { fromWorld: true } });
          }}
          aria-label="Back to case studies"
        >
          <img
            src={smallSurimiLogo}
            alt="SURIMI"
            className={styles.logoImage}
          />
        </button>

        <nav className={styles.scenarioNav}>
          {simulationCaseStudies.map((item) => {
            const isActive = item.id === caseId;
            const itemRunCount = getScenarioRunsByCaseId(item.id).length;

            return (
              <button
                key={item.id}
                type="button"
                className={[
                  styles.scenarioNavItem,
                  isActive ? styles.scenarioNavItemActive : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                onClick={() => {
                  navigate(`/scenario-runs/${item.id}`);
                }}
              >
                <span
                  className={styles.scenarioImageSlot}
                  data-case={item.id}
                  aria-hidden="true"
                >
                  <img
                    src={scenarioNavImages[item.id]}
                    alt=""
                    className={styles.scenarioImage}
                  />
                </span>
                <span className={styles.scenarioNavCopy}>
                  <strong>{getCaseLabel(item.id)}</strong>
                  <small>{itemRunCount} runs</small>
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
              onClick={() => {
                navigate("/", { state: { fromWorld: true } });
              }}
            >
              Back To Case Studies
            </Button>
            <div>
              <p>Scenario library</p>
              <h1>{getCaseLabel(caseId)} scenario runs</h1>
            </div>
          </div>

          <Button
            variant="primaryFilled"
            leftSection={<FiPlus size={16} />}
            onClick={() => {
              setIsScenarioInputsOpen(true);
            }}
          >
            Set Up Scenario
          </Button>
        </header>

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
                  <th>Conducted at</th>
                  <th>Status</th>
                  <th>Dashboard</th>
                </tr>
              </thead>
              <tbody>
                {visibleRuns.map((run) => {
                  const isActive = activeRun?.id === run.id;

                  return (
                    <tr
                      key={run.id}
                      className={isActive ? styles.activeRow : undefined}
                    >
                      <td>
                        <dl className={styles.inputsCell}>
                          <div>
                            <dt>Species</dt>
                            <dd>{run.inputs.speciesLabel}</dd>
                          </div>
                          <div>
                            <dt>Duration</dt>
                            <dd>{run.inputs.durationYears} years</dd>
                          </div>
                          <div>
                            <dt>IPCC</dt>
                            <dd>{getIpccLabel(run)}</dd>
                          </div>
                        </dl>
                      </td>
                      <td>
                        <div className={styles.nameCell}>
                          <strong>{getRunName(run)}</strong>
                          <span>{run.id}</span>
                        </div>
                      </td>
                      <td className={styles.dateCell}>
                        {formatDateTime(run.createdAt)}
                      </td>
                      <td>
                        <span className={styles.statusPill}>
                          <FiCheckCircle aria-hidden="true" />
                          Completed
                        </span>
                      </td>
                      <td>
                        <button
                          type="button"
                          className={styles.reportButton}
                          onClick={() => {
                            openDashboard(run.id);
                          }}
                          aria-label={`Open dashboard for ${getRunName(run)}`}
                        >
                          <FiEye aria-hidden="true" />
                          <span>View</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </ScrollArea>

          <footer className={styles.paginationBar}>
            <span>
              Showing {visibleRuns.length} of {runs.length} scenario runs
            </span>
            <Pagination
              total={totalPages}
              value={safeActivePage}
              onChange={setActivePage}
              size="sm"
              radius="sm"
            />
          </footer>
        </section>
      </section>

      {InputsFlowComponent ? (
        <InputsFlowComponent
          isOpen={isScenarioInputsOpen}
          onClose={() => {
            setIsScenarioInputsOpen(false);
          }}
          onComplete={completeScenarioSetup}
        />
      ) : null}

      <ScenarioSetupLoadingOverlay isVisible={isScenarioSetupLoading} />
    </main>
  );
};

export default ScenarioRunsPage;
