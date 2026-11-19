import Modal from "../../components/ui/Modal/Modal";
import Button from "../../components/ui/Button/Button";
import { sampleOutput } from "../../../mock-data/sampleOutput";
import { simulationCaseStudies } from "../../data/simulationCases";
import { AppError } from "../../network/errors/appError";
import { experimentSchema } from "../../network/services/experiments/experimentSchemas";
import { useExperiment } from "../../serverState/experiments/useExperiment";
import GenericScenarionOutputSkeleton from "./components/GenericScenarionOutputSkeleton";
import ScenarioOutputContent from "./ScenarioOutputContent";
import type { ScenarioOutputModalProps } from "./types";
import type { OutputSource } from "./netcdf/types";
import styles from "./ScenarioOutputModal.module.css";

function detailErrorMessage(error: unknown) {
  if (error instanceof AppError) {
    if (error.kind === "notFound") return "This simulation could not be found or is unavailable to your account.";
    if (error.kind === "forbidden") return "Your account cannot access this simulation.";
    if (error.kind === "network") return "Could not reach SURIMI. Check your connection and try again.";
    if (error.kind === "invalidResponse") return "The simulation details could not be read. Please contact the team.";
  }
  return "Could not load simulation details. Please try again.";
}

// Resolve URL identifiers independently of list pagination or in-memory row data.
// URLs contain IDs only; file URLs and permission checks stay in their services.
export default function ScenarioOutputModal({ experimentId, comparisonId, scenarioName, isOpen, onClose }: ScenarioOutputModalProps) {
  const ids = [experimentId.toLowerCase(), ...(comparisonId === undefined ? [] : [comparisonId.toLowerCase()])];
  const validId = (id: string) => id === sampleOutput.id || experimentSchema.shape.id.safeParse(id).success;
  const firstIsSample = ids[0] === sampleOutput.id;
  const secondIsSample = ids[1] === sampleOutput.id;
  const firstDetails = useExperiment(ids[0], isOpen && validId(ids[0]) && !firstIsSample);
  const secondDetails = useExperiment(ids[1] ?? "", isOpen && Boolean(ids[1]) && validId(ids[1]) && !secondIsSample);
  const firstCase = firstIsSample ? sampleOutput.scenarioName : firstDetails.data?.scenario_name;
  const caseName = simulationCaseStudies.find(study => study.scenarioName === (firstCase ?? scenarioName))?.seaName ?? "Scenario";
  const queries = [firstDetails, secondDetails];
  const activeQueries = queries.filter((_, index) => ids[index] && ids[index] !== sampleOutput.id && validId(ids[index]));
  const failed = activeQueries.find(query => query.isError);
  const sourceFor = (id: string, index: number): OutputSource | undefined => {
    if (id === sampleOutput.id) return sampleOutput;
    const experiment = queries[index].data;
    return experiment ? { id: experiment.id, name: experiment.name, scenarioName: experiment.scenario_name } : undefined;
  };
  const sources = ids.map(sourceFor).filter((source): source is OutputSource => Boolean(source));
  const notReady = ids.flatMap((id, index) => {
    const experiment = queries[index].data;
    return id !== sampleOutput.id && experiment && (experiment.status !== "completed" || experiment.outputs_state !== "ready") ? [experiment] : [];
  });
  let error: string | undefined;
  if (ids.some(id => !validId(id))) error = "The link contains an invalid simulation ID.";
  else if (ids.length === 2 && ids[0] === ids[1]) error = "Choose two different simulations to compare.";
  else if (failed) error = detailErrorMessage(failed.error);
  else if (firstCase && sources.some(source => source.scenarioName !== firstCase)) error = "Choose simulations from the same case study.";
  else if (scenarioName && firstCase && scenarioName !== firstCase) error = "This simulation does not match the selected case study.";
  const loading = !error && sources.length !== ids.length;

  return <Modal appearance="marine" opened={isOpen} onClose={onClose} title={`${caseName} · ${comparisonId ? "Compare outputs" : "Scenario output"}`}
    fullScreen compactHeader bodyClassName={styles.body}>
    <section className={styles.content} aria-label="Simulation output" aria-busy={loading}>
      {error ? <div className={styles.state} role="alert"><p>{error}</p>
        {failed ? <Button variant="primary-outlined" size="sm" isDisabled={activeQueries.some(query => query.isFetching)} onPress={() => { activeQueries.forEach(query => { void query.refetch(); }); }}>TRY AGAIN</Button> : null}
      </div> : loading ? <GenericScenarionOutputSkeleton status="Loading simulation details…" />
        : notReady.length ? <div className={styles.state} role="status">
          {notReady.map(experiment => <div key={experiment.id}><strong>{experiment.name} · {experiment.status}</strong><p>{experiment.error ?? `Outputs are ${experiment.outputs_state ?? "not available yet"}.`}</p></div>)}
          <Button variant="primary-outlined" size="sm" isDisabled={activeQueries.some(query => query.isFetching)} onPress={() => { activeQueries.forEach(query => { void query.refetch(); }); }}>REFRESH STATUS</Button>
        </div> : <ScenarioOutputContent sources={sources} onClose={onClose} />}
    </section>
  </Modal>;
}
