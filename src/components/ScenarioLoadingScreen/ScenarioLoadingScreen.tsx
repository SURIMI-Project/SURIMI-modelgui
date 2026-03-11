import { motion } from "framer-motion";
import styles from "./ScenarioLoadingScreen.module.css";

type ScenarioLoadingScreenProps = {
  title?: string;
  subtitle?: string;
};

const ScenarioLoadingScreen = ({
  title = "Initializing scenario",
  subtitle = "Preparing ecosystem model and simulation pipeline...",
}: ScenarioLoadingScreenProps) => {
  return (
    <motion.section
      className={styles.loadingScreen}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      aria-live="polite"
      aria-busy="true"
    >
      <div className={styles.backdropGlow} aria-hidden="true" />

      <motion.img
        src="/loadingFish.svg"
        alt="Loading fish"
        className={styles.loadingFish}
        initial={{ y: 10, opacity: 0 }}
        animate={{ y: [0, -8, 0], opacity: 1 }}
        transition={{
          y: {
            duration: 1.7,
            ease: "easeInOut",
            repeat: Infinity,
          },
          opacity: { duration: 0.4 },
        }}
      />

      <div className={styles.copyBlock}>
        <h2 className={styles.title}>{title}</h2>
        <p className={styles.subtitle}>{subtitle}</p>
      </div>

      <motion.div
        className={styles.progressTrack}
        initial={{ opacity: 0.3 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <motion.div
          className={styles.progressFill}
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 4.8, ease: "linear" }}
        />
      </motion.div>
    </motion.section>
  );
};

export default ScenarioLoadingScreen;
