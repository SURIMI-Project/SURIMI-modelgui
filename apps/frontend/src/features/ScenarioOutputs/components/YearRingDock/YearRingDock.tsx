import { AnimatePresence, motion } from "framer-motion";
import YearControls from "../YearControls/YearControls";
import styles from "../ScenarioOutputsShared/ScenarioOutputsShared.module.css";

type YearRingDockProps = {
  years: number[];
  currentYear: number;
  isPlaying: boolean;
  isOpen: boolean;
  onTogglePlay: () => void;
  onSelectYear: (year: number) => void;
  onToggleOpen: () => void;
};

const YearRingDock = ({
  years,
  currentYear,
  isPlaying,
  isOpen,
  onTogglePlay,
  onSelectYear,
  onToggleOpen,
}: YearRingDockProps) => {
  return (
    <div className={styles.ringDock}>
      <AnimatePresence>
        {isOpen ? (
          <motion.div
            className={styles.ringPanel}
            initial={{ opacity: 0, y: 28, scale: 0.86 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 22, scale: 0.9 }}
            transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
          >
            <YearControls
              years={years}
              currentYear={currentYear}
              isPlaying={isPlaying}
              onTogglePlay={onTogglePlay}
              onSelectYear={onSelectYear}
              size={188}
              showHint={false}
            />
          </motion.div>
        ) : null}
      </AnimatePresence>

      <button
        type="button"
        className={styles.ringLauncher}
        onClick={onToggleOpen}
        aria-expanded={isOpen}
        aria-label={isOpen ? "Minimize year selector" : "Open year selector"}
      >
        <span className={styles.ringLauncherYear}>{currentYear}</span>
      </button>
    </div>
  );
};

export default YearRingDock;
