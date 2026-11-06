import type { SimulationCaseId } from "../../data/simulationCases";
import PrimaryModal from "../PrimaryModal/PrimaryModal";
import ScenarioModelFlowGraph from "./ScenarioModelFlowGraph";
import styles from "./ScenarioInfoModal.module.css";

type ScenarioInfoModalProps = {
  opened: boolean;
  onClose: () => void;
  caseId: SimulationCaseId;
  title: string;
};

const ScenarioInfoModal = ({
  opened,
  onClose,
  caseId,
  title,
}: ScenarioInfoModalProps) => {
  return (
    <PrimaryModal
      opened={opened}
      onClose={onClose}
      title={title}
      size="min(1380px, 96vw)"
      zIndex={9000}
      withinPortal
      withOverlay
      overlayOpacity={0.78}
      overlayBlur={10}
      closeOnClickOutside
      bodyClassName={styles.modalBody}
    >
      <div
        className={[styles.modalScrollArea, styles.scrollAreaLayout1]
          .filter(Boolean)
          .join(" ")}
      >
        <div className={styles.shell}>
          <section className={styles.graphPanel}>
            <ScenarioModelFlowGraph caseId={caseId} />
          </section>
        </div>
      </div>
    </PrimaryModal>
  );
};

export type { ScenarioInfoModalProps };

export default ScenarioInfoModal;
