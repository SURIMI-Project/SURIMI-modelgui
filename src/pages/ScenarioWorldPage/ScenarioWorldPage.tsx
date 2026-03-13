import { motion } from "framer-motion";
import { useEffect, useState, type CSSProperties } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import FullBackgroundVideoPlayer from "../../components/FullBackgroundVideoPlayer/FullBackgroundVideoPlayer";
import ScenarioLoadingScreen from "../../components/ScenarioLoadingScreen/ScenarioLoadingScreen";
import ScenarioWorldFeatureSection from "./components/ScenarioWorldFeatureSection";
import ScenarioWorldFooter from "./components/ScenarioWorldFooter";
import ScenarioWorldStorySection from "./components/ScenarioWorldStorySection";
import useScenarioWorldRoute from "./hooks/useScenarioWorldRoute";
import styles from "./ScenarioWorldPage.module.css";

const RETURN_TO_OCEANS_DURATION_MS = 560;
const SCENARIO_LOADING_DURATION_MS = 5000;

const ScenarioWorldPage = () => {
  const navigate = useNavigate();
  const { caseStudy, worldConfig, fromLanding } = useScenarioWorldRoute();
  const [isReturningToHome, setIsReturningToHome] = useState(false);
  const [isScenarioInputsOpen, setIsScenarioInputsOpen] = useState(false);
  const [isScenarioLoading, setIsScenarioLoading] = useState(false);

  useEffect(() => {
    if (!isReturningToHome) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      navigate("/", {
        state: { fromWorld: true },
      });
    }, RETURN_TO_OCEANS_DURATION_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [isReturningToHome, navigate]);

  useEffect(() => {
    if (!isScenarioLoading || !caseStudy) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      navigate(`/scenario-outputs/${caseStudy.id}`);
    }, SCENARIO_LOADING_DURATION_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [caseStudy, isScenarioLoading, navigate]);

  if (!caseStudy || !worldConfig) {
    return <Navigate to="/" replace />;
  }

  const beginReturnToOceans = () => {
    if (isReturningToHome || isScenarioLoading) {
      return;
    }

    setIsReturningToHome(true);
  };

  const worldVariables = {
    "--world-accent": worldConfig.accentColor,
    "--world-secondary": worldConfig.secondaryColor,
    "--world-glow": worldConfig.glowColor,
  } as CSSProperties;
  const InputsFlowComponent = worldConfig.InputsFlowComponent;

  return (
    <main className={styles.page} style={worldVariables}>
      <FullBackgroundVideoPlayer
        variant={caseStudy.id}
        fromLanding={fromLanding}
        isReturningToHome={isReturningToHome}
      />

      <motion.div
        className={styles.lightField}
        initial={{ opacity: 0 }}
        animate={{ opacity: isReturningToHome ? 0.4 : 1 }}
        transition={{ duration: 0.5 }}
      />
      <div className={styles.particleField} aria-hidden="true" />
      <div className={styles.vignette} aria-hidden="true" />
      <motion.div
        className={styles.returnCurtain}
        initial={{ opacity: 0 }}
        animate={{ opacity: isReturningToHome ? 1 : 0 }}
        transition={{ duration: 0.48, ease: [0.22, 1, 0.36, 1] }}
      />

      <motion.section
        className={styles.contentGrid}
        initial={false}
        animate={{
          opacity: isReturningToHome || isScenarioLoading ? 0 : 1,
          y: isReturningToHome || isScenarioLoading ? 34 : 0,
          filter:
            isReturningToHome || isScenarioLoading ? "blur(6px)" : "blur(0px)",
        }}
        transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
      >
        <ScenarioWorldStorySection
          worldTitle={worldConfig.worldTitle}
          aboutTitle={worldConfig.aboutTitle}
          description={worldConfig.description}
          simulationContext={worldConfig.simulationContext}
          fromLanding={fromLanding}
        />

        <ScenarioWorldFeatureSection
          worldConfig={worldConfig}
          fromLanding={fromLanding}
        />
      </motion.section>

      <ScenarioWorldFooter
        isReturningToHome={isReturningToHome || isScenarioLoading}
        onBackToOceans={beginReturnToOceans}
        onStartScenario={() => {
          if (isScenarioLoading || isReturningToHome) {
            return;
          }

          if (InputsFlowComponent) {
            setIsScenarioInputsOpen(true);
          }
        }}
        showStockStatusButton={caseStudy.id === "anchovy-bay"}
        onOpenStockStatus={() => {
          navigate("/test");
        }}
      />
      {InputsFlowComponent ? (
        <InputsFlowComponent
          isOpen={isScenarioInputsOpen}
          onClose={() => {
            setIsScenarioInputsOpen(false);
          }}
          onComplete={() => {
            setIsScenarioInputsOpen(false);
            setIsScenarioLoading(true);
          }}
        />
      ) : null}
      {isScenarioLoading ? (
        <ScenarioLoadingScreen
          title={`Initializing ${worldConfig.worldTitle}`}
          subtitle="Compiling selected inputs and launching scenario output..."
        />
      ) : null}
    </main>
  );
};

export default ScenarioWorldPage;
