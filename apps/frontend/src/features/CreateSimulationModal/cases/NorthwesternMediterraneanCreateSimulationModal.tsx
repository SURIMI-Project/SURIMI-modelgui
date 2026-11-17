import CreateSimulationModal from "../CreateSimulationModal";
import type { CreateSimulationModalProps } from "../types";
import { useExperimentOptions } from "../../../serverState/scenarios/useExperimentOptions";
import { useCreateExperiment } from "../../../serverState/experiments/useCreateExperiment";
import Button from "../../../components/ui/Button/Button";
import NorthwesternSimulationFlow from "../flows/northwestern/NorthwesternSimulationFlow";
import { SCENARIO_NAME } from "../flows/northwestern/form";
import styles from "../CreateSimulationModal.module.css";

export default function NorthwesternMediterraneanCreateSimulationModal({ isOpen, onClose, onComplete }: CreateSimulationModalProps) {
  const options = useExperimentOptions(SCENARIO_NAME, isOpen);
  const create = useCreateExperiment(SCENARIO_NAME);
  return <CreateSimulationModal isOpen={isOpen} onClose={onClose} isSubmitting={create.isPending} title="Northwestern Mediterranean · Set up scenario">
    {options.data ? <NorthwesternSimulationFlow options={options.data} onClose={onClose}
      onCreate={payload => create.mutateAsync(payload)} onComplete={experiment => { onComplete?.(experiment); onClose(); }} />
      : options.isError ? <div className={styles.formBody} role="alert"><p>Could not load simulation options.</p>
        <Button variant="primary-outlined" isDisabled={options.isFetching} onPress={() => { void options.refetch(); }}>TRY AGAIN</Button></div>
      : <div className={styles.formBody} role="status">Loading simulation options…</div>}
  </CreateSimulationModal>;
}
