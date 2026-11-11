import { motion } from "framer-motion";
import { useEffect, useState, type CSSProperties } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import ScenarioInfoModal from "../../components/ScenarioInfoModal/ScenarioInfoModal";
import { normalizeSimulationCaseId } from "../../data/simulationCases";
import { useScenarioSetupCompletion } from "../../features/ScenarioRuns/useScenarioSetupCompletion";
import ScenarioWorldFeatureSection from "./components/ScenarioWorldFeatureSection";
import ScenarioWorldFooter from "./components/ScenarioWorldFooter";
import ScenarioWorldStorySection from "./components/ScenarioWorldStorySection";
import useScenarioWorldRoute from "./hooks/useScenarioWorldRoute";
import styles from "./ScenarioWorldPage.module.css";

const RETURN_TO_OCEANS_DURATION_MS = 560;

const ScenarioWorldPage = () => {
  const navigate = useNavigate();
  const { caseId } = useParams<{ caseId?: string }>();
  const { caseStudy, worldConfig, fromLanding, initialAction } = useScenarioWorldRoute();
  const [isReturningToHome, setIsReturningToHome] = useState(false);
  const [isScenarioInputsOpen, setIsScenarioInputsOpen] = useState(initialAction === "setup");
  const [isScenarioInfoOpen, setIsScenarioInfoOpen] = useState(initialAction === "models");
  const setupCaseId = caseStudy?.id ?? "anchovy-bay";
  const { completeScenarioSetup } =
    useScenarioSetupCompletion({
      caseId: setupCaseId,
      onSetupStarted: () => {
        setIsScenarioInputsOpen(false);
      },
    });

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

  const normalizedCaseId = normalizeSimulationCaseId(caseId);

  if (caseId && normalizedCaseId && normalizedCaseId !== caseId) {
    return <Navigate to={`/scenario/${normalizedCaseId}`} replace />;
  }

  if (!caseStudy || !worldConfig) {
    return <Navigate to="/" replace />;
  }

  const beginReturnToOceans = () => {
    if (isReturningToHome) {
      return;
    }

    setIsReturningToHome(true);
  };

  const worldVariables = {
    "--world-accent": worldConfig.accentColor,
    "--world-secondary": worldConfig.secondaryColor,
    "--world-glow": worldConfig.glowColor,
    "--world-bg-top": worldConfig.backgroundTopColor,
    "--world-bg-bottom": worldConfig.backgroundBottomColor,
    "--world-bg-highlight": worldConfig.backgroundHighlightColor,
  } as CSSProperties;
  const CreateSimulationModalComponent = worldConfig.CreateSimulationModalComponent;

  return (
    <main className={styles.page} style={worldVariables}>
      <motion.div
        className={styles.backgroundCanvas}
        initial={{ scale: fromLanding ? 1.08 : 1.02, opacity: 0.84 }}
        animate={{
          scale: isReturningToHome ? 1.06 : 1,
          opacity: isReturningToHome ? 0.72 : 1,
        }}
        transition={{
          duration: isReturningToHome ? 0.56 : fromLanding ? 0.78 : 0.58,
          ease: [0.22, 1, 0.36, 1],
        }}
      />
      <div className={styles.backgroundContours} aria-hidden="true" />
      <div className={styles.backgroundGrid} aria-hidden="true" />

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
          opacity: isReturningToHome ? 0 : 1,
          y: isReturningToHome ? 34 : 0,
          filter: isReturningToHome ? "blur(6px)" : "blur(0px)",
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
          onOpenInfoModal={() => {
            if (isReturningToHome) {
              return;
            }

            setIsScenarioInfoOpen(true);
          }}
        />
      </motion.section>

      <ScenarioWorldFooter
        isReturningToHome={isReturningToHome}
        onBackToOceans={beginReturnToOceans}
        onStartScenario={() => {
          if (isReturningToHome) {
            return;
          }

          if (CreateSimulationModalComponent) {
            setIsScenarioInputsOpen(true);
          }
        }}
        showStockStatusButton={caseStudy.id === "anchovy-bay"}
        onOpenStockStatus={() => {
          navigate("/test");
        }}
      />
      {CreateSimulationModalComponent ? (
        <CreateSimulationModalComponent
          isOpen={isScenarioInputsOpen}
          onClose={() => {
            setIsScenarioInputsOpen(false);
          }}
          onComplete={completeScenarioSetup}
        />
      ) : null}
      <ScenarioInfoModal
        opened={isScenarioInfoOpen}
        onClose={() => {
          setIsScenarioInfoOpen(false);
        }}
        caseId={caseStudy.id}
        title={worldConfig.infoModalTitle}
      />
    </main>
  );
};

export default ScenarioWorldPage;
