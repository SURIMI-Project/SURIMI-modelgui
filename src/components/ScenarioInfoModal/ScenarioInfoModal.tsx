import PrimaryModal from "../PrimaryModal/PrimaryModal";
import ScenarioModelFlowGraph from "./ScenarioModelFlowGraph";
import styles from "./ScenarioInfoModal.module.css";

type ScenarioInfoModalProps = {
  opened: boolean;
  onClose: () => void;
  title: string;
  description: string[];
};

const ScenarioInfoModal = ({
  opened,
  onClose,
  title,
  description,
}: ScenarioInfoModalProps) => {
  const [lead, ...rest] = description;

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
    >
      <div className={styles.shell}>
        <section className={styles.graphPanel}>
          <ScenarioModelFlowGraph />
        </section>

        <section className={styles.contentPanel}>
          <p className={styles.contentKicker}>Scenario System Overview</p>
          <h2 className={styles.contentTitle}>{title}</h2>
          {lead ? <p className={styles.contentLead}>{lead}</p> : null}
          {rest.map((paragraph) => (
            <p key={paragraph} className={styles.contentParagraph}>
              {paragraph}
            </p>
          ))}
          <div className={styles.metaCard}>
            <h3 className={styles.metaCardTitle}>Why this view exists</h3>
            <p className={styles.metaCardText}>
              This modal keeps the system interaction map in one shared place
              across all scenario pages, while allowing the explanatory text to
              change per case study.
            </p>
          </div>
        </section>
      </div>
    </PrimaryModal>
  );
};

export type { ScenarioInfoModalProps };

export default ScenarioInfoModal;
