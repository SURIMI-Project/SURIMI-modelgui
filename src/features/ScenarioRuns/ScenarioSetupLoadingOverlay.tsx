import { AnimatePresence } from "framer-motion";
import ScenarioLoadingScreen from "../../components/ScenarioLoadingScreen/ScenarioLoadingScreen";

type ScenarioSetupLoadingOverlayProps = {
  isVisible: boolean;
  title?: string;
  subtitle?: string;
};

const ScenarioSetupLoadingOverlay = ({
  isVisible,
  title = "Running scenario setup",
  subtitle = "Preparing the simulation package and adding it to the scenario runs library...",
}: ScenarioSetupLoadingOverlayProps) => {
  return (
    <AnimatePresence>
      {isVisible ? (
        <ScenarioLoadingScreen title={title} subtitle={subtitle} />
      ) : null}
    </AnimatePresence>
  );
};

export default ScenarioSetupLoadingOverlay;
