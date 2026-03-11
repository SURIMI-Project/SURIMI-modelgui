import { Button } from "@mantine/core";
import { motion } from "framer-motion";
import { FiArrowLeft } from "react-icons/fi";
import styles from "../ScenarioWorldPage.module.css";

type ScenarioWorldFooterProps = {
  isReturningToHome: boolean;
  onBackToOceans: () => void;
  onStartScenario: () => void;
  showStockStatusButton?: boolean;
  onOpenStockStatus?: () => void;
};

const ScenarioWorldFooter = ({
  isReturningToHome,
  onBackToOceans,
  onStartScenario,
  showStockStatusButton = false,
  onOpenStockStatus,
}: ScenarioWorldFooterProps) => {
  return (
    <motion.footer
      className={styles.footerActions}
      initial={{ opacity: 0, y: 22 }}
      animate={{
        opacity: isReturningToHome ? 0 : 1,
        y: isReturningToHome ? 24 : 0,
      }}
      transition={{
        duration: 0.56,
        delay: isReturningToHome ? 0 : 0.92,
        ease: [0.22, 1, 0.36, 1],
      }}
    >
      <Button
        variant="primaryOutlined"
        className={styles.backButton}
        leftSection={<FiArrowLeft size={16} />}
        onClick={onBackToOceans}
        loading={isReturningToHome}
        disabled={isReturningToHome}
      >
        Back To Scenarios
      </Button>
      <Button
        variant="primaryFilled"
        className={styles.startButton}
        onClick={onStartScenario}
        disabled={isReturningToHome}
      >
        Start Scenario
      </Button>
      {showStockStatusButton ? (
        <Button
          variant="primaryOutlined"
          className={styles.stockStatusButton}
          onClick={onOpenStockStatus}
          disabled={isReturningToHome}
        >
          STOCK STATUS &amp; MSY MODEL
        </Button>
      ) : null}
    </motion.footer>
  );
};

export default ScenarioWorldFooter;
