import { Card, Text, Title } from "@mantine/core";
import { motion } from "framer-motion";
import styles from "./WesternMediterraneanOutputs.module.css";

const WesternMediterraneanOutputs = () => {
  return (
    <main className={styles.page}>
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      >
        <Card className={styles.card}>
          <Text className={styles.kicker}>Scenario Outputs</Text>
          <Title className={styles.title}>Western Mediterranean</Title>
          <Text className={styles.description}>
            Outputs architecture is wired. Western Mediterranean analytics panel will be implemented next.
          </Text>
        </Card>
      </motion.div>
    </main>
  );
};

export default WesternMediterraneanOutputs;
