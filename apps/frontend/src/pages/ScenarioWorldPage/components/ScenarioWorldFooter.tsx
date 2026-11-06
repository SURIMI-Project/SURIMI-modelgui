import Button from "../../../components/ui/Button/Button";
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
        variant="primary-outlined"
        className={styles.backButton}
        onPress={onBackToOceans}
        isPending={isReturningToHome}
        isDisabled={isReturningToHome}
      >
        {" "}
        <FiArrowLeft size={16} />
        Back To Case Studies
      </Button>
      <Button
        variant="primary"
        className={styles.startButton}
        onPress={onStartScenario}
        isDisabled={isReturningToHome}
      >
        Set Up Scenario
      </Button>
      {showStockStatusButton ? (
        <Button
          variant="primary-outlined"
          className={styles.stockStatusButton}
          onPress={onOpenStockStatus}
          isDisabled={isReturningToHome}
        >
          STOCK STATUS &amp; MSY MODEL
        </Button>
      ) : null}
    </motion.footer>
  );
};

export default ScenarioWorldFooter;
