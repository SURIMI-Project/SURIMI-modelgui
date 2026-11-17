import CreateSimulationModal from "../CreateSimulationModal";
import type { CreateSimulationModalProps } from "../types";
import styles from "../CreateSimulationModal.module.css";

// This case will own its flow when its setup requirements are confirmed.
export default function AegeanSeaCreateSimulationModal(props: CreateSimulationModalProps) {
  return <CreateSimulationModal {...props} title="Aegean Sea · Set up scenario">
    <p className={styles.formBody}>Simulation creation for Aegean Sea is not available yet.</p>
  </CreateSimulationModal>;
}
