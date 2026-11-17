import Modal from "../../components/ui/Modal/Modal";
import Button from "../../components/ui/Button/Button";
import { simulationCaseStudies } from "../../data/simulationCases";
import { AppError } from "../../network/errors/appError";
import { useExperiment } from "../../serverState/experiments/useExperiment";
import ScenarioOutputContent from "./ScenarioOutputContent";
import type { ScenarioOutputModalProps } from "./types";
import styles from "./ScenarioOutputModal.module.css";

function detailErrorMessage(error: unknown) {
  if (error instanceof AppError) {
    if (error.kind === "notFound") return "This simulation could not be found.";
    if (error.kind === "forbidden") return "Your account cannot access this simulation.";
    if (error.kind === "network") return "Could not reach SURIMI. Check your connection and try again.";
    if (error.kind === "invalidResponse") return "The simulation details could not be read. Please contact the team.";
  }
  return "Could not load simulation details. Please try again.";
}

export default function ScenarioOutputModal({ experimentId, scenarioName, isOpen, onClose }: ScenarioOutputModalProps) {
  const details = useExperiment(experimentId, isOpen);
  const caseName = simulationCaseStudies.find(study => study.scenarioName === scenarioName)?.seaName ?? "Scenario";
  const matches = details.data?.id === experimentId && details.data.scenario_name === scenarioName;

  return <Modal appearance="marine" opened={isOpen} onClose={onClose} title={`${caseName} · Scenario output`}
    size="var(--layout-content-max)" bodyClassName={styles.body}>
    <section className={styles.content} aria-label="Simulation output" aria-busy={details.isFetching}>
      {details.isPending ? <p className={styles.state} role="status">Loading simulation details…</p>
        : details.isError ? <div className={styles.state} role="alert">
          <p>{detailErrorMessage(details.error)}</p>
          <Button variant="primary-outlined" size="sm" isDisabled={details.isFetching} onPress={() => { void details.refetch(); }}>TRY AGAIN</Button>
        </div>
        : !matches ? <p className={styles.state} role="alert">This simulation does not match the selected case study.</p>
        : <><span className={styles.srOnly} role="status">Simulation details loaded.</span><ScenarioOutputContent experiment={details.data} /></>}
    </section>
  </Modal>;
}
