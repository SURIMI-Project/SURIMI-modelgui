import {
  type Duration,
  type Timestamp,
  timestampDate,
} from "@bufbuild/protobuf/wkt";
import { Button, Checkbox, Pagination, ScrollArea } from "@mantine/core";
import { useEffect, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import {
  FiAlertCircle,
  FiAnchor,
  FiArrowLeft,
  FiCheckCircle,
  FiClock,
  FiCompass,
  FiEye,
  FiNavigation,
  FiPlus,
} from "react-icons/fi";
import { getScenarioWorldConfig } from "../../constants/scenarioWorldConfig";
import {
  getSimulationCaseById,
  normalizeSimulationCaseId,
  simulationCaseStudies,
  type SimulationCaseId,
} from "../../data/simulationCases";
import ScenarioSetupLoadingOverlay from "../../features/ScenarioRuns/ScenarioSetupLoadingOverlay";
import { useScenarioSetupCompletion } from "../../features/ScenarioRuns/useScenarioSetupCompletion";
import type { SimulationStatus } from "../../gen/surimi/v1/simulation_status_pb";
import { useSimulationStatuses } from "../../hooks/useSimulationStatuses";
import smallSurimiLogo from "../../assets/smallSurimiLogo.png";
import styles from "./ScenarioRunsPage.module.css";

const PAGE_SIZE = 6;
const scenarioNavIcons = {
  "anchovy-bay": FiAnchor,
  "aegean-sea": FiCompass,
  "northwestern-mediterranean": FiNavigation,
} satisfies Record<SimulationCaseId, typeof FiAnchor>;

const MS_PER_YEAR = 365.25 * 24 * 60 * 60 * 1000;
const statusIcons = {
  done: FiCheckCircle,
  failed: FiAlertCircle,
  pending: FiClock,
};

const formatDateTime = (value?: Timestamp) => {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(timestampDate(value));
};

const formatYear = (value?: Timestamp) => {
  return value ? String(timestampDate(value).getUTCFullYear()) : "?";
};

const formatSimulatedYears = (run: SimulationStatus) => {
  if (!run.startDateTime || !run.endDateTime) {
    return "—";
  }

  const years =
    (timestampDate(run.endDateTime).getTime() -
      timestampDate(run.startDateTime).getTime()) /
    MS_PER_YEAR;
  return `${Math.round(years * 10) / 10} years`;
};

const formatRunTime = (value?: Duration) => {
  if (!value) {
    return "—";
  }

  const totalSeconds = Math.round(Number(value.seconds));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
};

const getRunName = (run: SimulationStatus) => `Simulation ${run.order}`;

// The protocol leaves the status values open ("Initialising, t.b.d."); the
// controller currently sends "Initialised" and "Finished".
const getStatusTone = (status: string): keyof typeof statusIcons => {
  if (/finish|complet|success/i.test(status)) {
    return "done";
  }

  if (/fail|error|cancel|abort/i.test(status)) {
    return "failed";
  }

  return "pending";
};

// How far through its simulated period a run is, e.g. "40%"; null if unknown.
const getProgressLabel = (run: SimulationStatus) => {
  if (!run.startDateTime || !run.endDateTime || !run.simulationCurrent) {
    return null;
  }

  const start = timestampDate(run.startDateTime).getTime();
  const end = timestampDate(run.endDateTime).getTime();
  const current = timestampDate(run.simulationCurrent).getTime();
  if (end <= start) {
    return null;
  }

  const ratio = Math.min(1, Math.max(0, (current - start) / (end - start)));
  return `${Math.round(ratio * 100)}%`;
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
  const [selectedRunIds, setSelectedRunIds] = useState<string[]>([]);
  const { statuses, error: statusesError } = useSimulationStatuses();
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

  useEffect(() => {
    setSelectedRunIds([]);
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
  const InputsFlowComponent = worldConfig.InputsFlowComponent;

  if (!caseStudy) {
    return <Navigate to="/" replace />;
  }

  // GetAllSimulationStatuses has no scenario filter, so filter here.
  const getCaseRuns = (id: SimulationCaseId) => {
    const scenarioName = getSimulationCaseById(id)?.controllerScenarioName;
    return (statuses ?? [])
      .filter((run) => run.scenarioName === scenarioName)
      .sort((a, b) => b.order - a.order);
  };

  const caseRuns = getCaseRuns(selectedCaseId);
  const activeRun = caseRuns.find((run) => run.simulationId === runId);
  const runs = activeRun
    ? [activeRun, ...caseRuns.filter((run) => run !== activeRun)]
    : caseRuns;

  const totalPages = Math.max(1, Math.ceil(runs.length / PAGE_SIZE));
  const safeActivePage = Math.min(activePage, totalPages);
  const startIndex = (safeActivePage - 1) * PAGE_SIZE;
  const visibleRuns = runs.slice(startIndex, startIndex + PAGE_SIZE);

  const openDashboard = (id: string) => {
    navigate(
      `/scenario-outputs/${selectedCaseId}?run=${encodeURIComponent(id)}`,
    );
  };

  const openCompareDashboard = () => {
    if (selectedRunIds.length !== 2) {
      return;
    }

    const query = selectedRunIds
      .slice(0, 2)
      .map((id) => `run=${encodeURIComponent(id)}`)
      .join("&");

    navigate(`/scenario-outputs/${selectedCaseId}?${query}`);
  };

  const toggleRunSelection = (id: string, checked: boolean) => {
    setSelectedRunIds((current) => {
      if (checked) {
        if (current.includes(id)) {
          return current;
        }

        return [...current, id].slice(-2);
      }

      return current.filter((runId) => runId !== id);
    });
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
            const itemRunCount = statuses ? getCaseRuns(item.id).length : "…";
            const ScenarioIcon = scenarioNavIcons[item.id];

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
                  <ScenarioIcon aria-hidden="true" />
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

          <div className={styles.topbarActions}>
            <Button
              variant="primaryOutlined"
              disabled={selectedRunIds.length !== 2}
              onClick={openCompareDashboard}
            >
              Compare Selected
            </Button>
            <Button
              variant="primaryFilled"
              leftSection={<FiPlus size={16} />}
              onClick={() => {
                setIsScenarioInputsOpen(true);
              }}
            >
              Set Up Scenario
            </Button>
          </div>
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
                  <th>Compare</th>
                  <th>Inputs</th>
                  <th>Name</th>
                  <th>Conducted at</th>
                  <th>Status</th>
                  <th>Dashboard</th>
                </tr>
              </thead>
              <tbody>
                {runs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className={styles.emptyCell}>
                      {statuses
                        ? "No simulations for this case study yet."
                        : statusesError
                          ? "Could not load simulations from the controller."
                          : "Loading simulations…"}
                    </td>
                  </tr>
                ) : null}
                {visibleRuns.map((run) => {
                  const isActive = activeRun === run;
                  const isSelected = selectedRunIds.includes(run.simulationId);
                  const statusTone = getStatusTone(run.status);
                  const StatusIcon = statusIcons[statusTone];
                  const progressLabel =
                    statusTone === "pending" ? getProgressLabel(run) : null;

                  return (
                    <tr
                      key={run.simulationId}
                      className={isActive ? styles.activeRow : undefined}
                    >
                      <td className={styles.checkboxCell}>
                        <Checkbox
                          checked={isSelected}
                          onChange={(event) => {
                            toggleRunSelection(
                              run.simulationId,
                              event.currentTarget.checked,
                            );
                          }}
                          aria-label={`Select ${getRunName(run)} for comparison`}
                        />
                      </td>
                      <td>
                        <dl className={styles.inputsCell}>
                          <div>
                            <dt>Period</dt>
                            <dd>
                              {formatYear(run.startDateTime)} –{" "}
                              {formatYear(run.endDateTime)}
                            </dd>
                          </div>
                          <div>
                            <dt>Duration</dt>
                            <dd>{formatSimulatedYears(run)}</dd>
                          </div>
                          <div>
                            <dt>Run time</dt>
                            <dd>{formatRunTime(run.simulationDuration)}</dd>
                          </div>
                        </dl>
                      </td>
                      <td>
                        <div className={styles.nameCell}>
                          <strong>{getRunName(run)}</strong>
                          <span title={run.experimentId}>
                            Experiment {run.experimentId.slice(0, 8)}
                          </span>
                        </div>
                      </td>
                      <td className={styles.dateCell}>
                        {formatDateTime(run.simulationStarted)}
                      </td>
                      <td>
                        <span
                          className={styles.statusPill}
                          data-tone={statusTone}
                        >
                          <StatusIcon aria-hidden="true" />
                          {run.status || "Unknown"}
                          {progressLabel ? ` · ${progressLabel}` : null}
                        </span>
                      </td>
                      <td>
                        <button
                          type="button"
                          className={styles.reportButton}
                          onClick={() => {
                            openDashboard(run.simulationId);
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
              {statuses && statusesError ? " · last refresh failed" : null}
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
