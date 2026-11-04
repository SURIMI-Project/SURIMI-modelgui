import { motion } from "framer-motion";
import type { ScenarioWorldConfig } from "../../../constants/scenarioWorldConfig";
import styles from "../ScenarioWorldPage.module.css";

type ScenarioWorldFeatureSectionProps = {
  worldConfig: ScenarioWorldConfig;
  fromLanding: boolean;
  onOpenInfoModal: () => void;
};

const ScenarioWorldFeatureSection = ({
  worldConfig,
  fromLanding,
  onOpenInfoModal,
}: ScenarioWorldFeatureSectionProps) => {
  const FeatureComponent = worldConfig.FeatureComponent;
  const hasFeatureTitle = worldConfig.featureTitle.trim().length > 0;
  const hasFeatureSubtitle = worldConfig.featureSubtitle.trim().length > 0;

  return (
    <motion.div
      className={styles.featureColumn}
      style={{
        width: `min(100%, ${worldConfig.featureColumnMaxWidth ?? 600}px)`,
      }}
      initial={{ opacity: 0, x: 48, filter: "blur(8px)" }}
      animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
      transition={{
        duration: 0.68,
        delay: fromLanding ? 0.28 : 0.12,
        ease: [0.22, 1, 0.36, 1],
      }}
    >
      {hasFeatureTitle ? (
        <motion.p
          className={styles.featureKicker}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.44, delay: 0.42 }}
        >
          {worldConfig.featureTitle}
        </motion.p>
      ) : null}

      {hasFeatureSubtitle ? (
        <motion.p
          className={styles.featureSubtitle}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.48, delay: 0.54 }}
        >
          {worldConfig.featureSubtitle}
        </motion.p>
      ) : null}
      <FeatureComponent onOpenInfoModal={onOpenInfoModal} />
    </motion.div>
  );
};

export default ScenarioWorldFeatureSection;
