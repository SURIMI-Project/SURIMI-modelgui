import { motion } from "framer-motion";
import styles from "../ScenarioWorldPage.module.css";
import { Flex } from "@mantine/core";

type ScenarioWorldStorySectionProps = {
  worldTitle: string;
  aboutTitle: string;
  description: string[];
  simulationContext: string;
  fromLanding: boolean;
  onOpenInfoModal: () => void;
};

const ScenarioWorldStorySection = ({
  worldTitle,
  aboutTitle,
  description,
  simulationContext,
  fromLanding,
  onOpenInfoModal,
}: ScenarioWorldStorySectionProps) => {
  return (
    <motion.div
      className={styles.storyColumn}
      initial={{ opacity: 0, x: -40, filter: "blur(7px)" }}
      animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
      transition={{
        duration: 0.64,
        delay: fromLanding ? 0.2 : 0.08,
        ease: [0.22, 1, 0.36, 1],
      }}
    >
      <motion.div
        className={styles.worldTitleRow}
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          duration: 0.56,
          delay: 0.28,
          ease: [0.22, 1, 0.36, 1],
        }}
      >
        <h1 className={styles.worldTitle}>{worldTitle}</h1>
      </motion.div>

      <Flex mt={12} gap={12}>
        <motion.h2
          className={styles.aboutTitle}
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.52, delay: 0.38 }}
        >
          {aboutTitle}
        </motion.h2>

        <motion.div
          className={styles.worldKickerRow}
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.42, delay: 0.2 }}
        >
          <button
            type="button"
            className={styles.worldInfoButton}
            onClick={onOpenInfoModal}
            aria-label={`Open more information about ${worldTitle}`}
            style={{
              transform: "translateY(5px)",
            }}
          >
            About the models
          </button>
        </motion.div>
      </Flex>

      {description.map((paragraph, index) => (
        <motion.p
          key={paragraph}
          className={styles.description}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.52, delay: 0.46 + index * 0.12 }}
        >
          {paragraph}
        </motion.p>
      ))}

      <motion.div
        className={styles.contextPanel}
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.52, delay: 0.84 }}
      >
        <span>Scenario Context</span>
        <p>{simulationContext}</p>
      </motion.div>
    </motion.div>
  );
};

export default ScenarioWorldStorySection;
