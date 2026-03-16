import type { ReactNode } from "react";
import PrimaryModal from "../../../../components/PrimaryModal/PrimaryModal";
import styles from "./PlaybackOverviewModal.module.css";

type PlaybackOverviewModalProps = {
  opened: boolean;
  onClose: () => void;
  mapPanel: ReactNode;
  chartPanels: ReactNode[];
};

const PlaybackOverviewModal = ({
  opened,
  onClose,
  mapPanel,
  chartPanels,
}: PlaybackOverviewModalProps) => {
  return (
    <PrimaryModal
      opened={opened}
      onClose={onClose}
      fullScreen
      zIndex={12000}
      withinPortal
      overlayBlur={12}
      closeOnClickOutside
    >
      <div className={styles.shell}>
        <div className={styles.grid}>
          <div className={styles.cell}>{mapPanel}</div>
          {chartPanels.map((panel, index) => (
            <div key={index} className={styles.cell}>
              {panel}
            </div>
          ))}
        </div>
      </div>
    </PrimaryModal>
  );
};

export default PlaybackOverviewModal;
