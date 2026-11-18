import local from "../flows/northwestern/NorthwesternSimulationFlow.module.css";
import HcrIntroduction from "../flows/northwestern/HcrIntroduction";
import CreateSimulationModal from "../CreateSimulationModal";
import type { CreateSimulationModalProps } from "../types";
import { useExperimentOptions } from "../../../serverState/scenarios/useExperimentOptions";
import { useCreateExperiment } from "../../../serverState/experiments/useCreateExperiment";
import Button from "../../../components/ui/Button/Button";
import Select from "../../../components/ui/Select/Select";
import NorthwesternSimulationFlow from "../flows/northwestern/NorthwesternSimulationFlow";
import { SCENARIO_NAME } from "../flows/northwestern/form";
import styles from "../CreateSimulationModal.module.css";

export default function NorthwesternMediterraneanCreateSimulationModal({ isOpen, onClose, onComplete }: CreateSimulationModalProps) {
  const options = useExperimentOptions(SCENARIO_NAME, isOpen);
  const create = useCreateExperiment(SCENARIO_NAME);
  return <CreateSimulationModal isOpen={isOpen} onClose={onClose} isSubmitting={create.isPending} title="Northwestern Mediterranean · Set up scenario">
    {options.data ? <NorthwesternSimulationFlow options={options.data} onClose={onClose}
      onCreate={payload => create.mutateAsync(payload)} onComplete={experiment => { onComplete?.(experiment); onClose(); }} />
      : <div className={styles.root} aria-busy={!options.isError}>
        <div className={styles.formBody}>
          <div className={styles.loadingContent}>
            <HcrIntroduction><Select className={local.speciesSelect} label="Species and life stage" placeholder="Select a species and life stage" options={[]} selectedKey={null} isDisabled /></HcrIntroduction>
            <div className={styles.loadingChart} role={options.isError ? "alert" : "status"}>
              {options.isError ? <div><p>Could not load simulation options.</p><Button variant="primary-outlined" isDisabled={options.isFetching} onPress={() => { void options.refetch(); }}>TRY AGAIN</Button></div> : "Loading simulation options…"}
            </div>
            <div className={styles.loadingTable} aria-hidden="true" />
          </div>
        </div>
        <footer className={styles.footer}>
          <Button variant="primary-outlined" onPress={onClose}>CANCEL</Button>
          <div className={styles.footerActions}>
            <Button variant="ghost" size="sm" isDisabled>Continue without configuration</Button>
            <Button isDisabled>NEXT</Button>
          </div>
        </footer>
      </div>}
  </CreateSimulationModal>;
}
