import CreateSimulationModal from "../CreateSimulationModal";
import type { CreateSimulationModalProps } from "../types";
import styles from "../CreateSimulationModal.module.css";

export default function AnchovyCreateSimulationModal(props: CreateSimulationModalProps) {
  return <CreateSimulationModal {...props} title="Anchovy Bay · Set up scenario">
    <p className={styles.formBody}>Simulation creation for Anchovy Bay is not available yet.</p>
  </CreateSimulationModal>;
}
