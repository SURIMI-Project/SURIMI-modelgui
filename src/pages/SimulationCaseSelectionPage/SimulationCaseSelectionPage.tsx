import { Button } from "@mantine/core";
import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Logo from "../../components/Logo/Logo";
import {
  simulationCaseStudies,
  type SimulationCaseId,
} from "../../data/simulationCases";
import styles from "./SimulationCaseSelectionPage.module.css";

const ENTER_WORLD_DURATION_MS = 700;
const PANEL_EASE = [0.22, 1, 0.36, 1] as const;

const resolveCaseToneClass = (caseId: SimulationCaseId) => {
  if (caseId === "western-mediterranean") {
    return styles.toneWestern;
  }
  if (caseId === "aegean-sea") {
    return styles.toneAegean;
  }
  return styles.toneAnchovy;
};

type SimulationCaseSelectionPageProps = {
  initialActiveCaseId?: SimulationCaseId | null;
};

type SimulationCaseSelectionRouteState = {
  fromWorld?: boolean;
};

const SimulationCaseSelectionPage = ({
  initialActiveCaseId = null,
}: SimulationCaseSelectionPageProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeCaseId, setActiveCaseId] = useState<SimulationCaseId | null>(
    initialActiveCaseId,
  );
  const [enteringCaseId, setEnteringCaseId] = useState<SimulationCaseId | null>(
    null,
  );

  const focusedCaseId = enteringCaseId ?? activeCaseId;
  const hasFocusedCase = Boolean(focusedCaseId);
  const isTransitioning = enteringCaseId !== null;
  const isReturningFromWorld = Boolean(
    (location.state as SimulationCaseSelectionRouteState | null)?.fromWorld,
  );

  const focusedCaseIndex = useMemo(() => {
    if (!focusedCaseId) {
      return -1;
    }

    return simulationCaseStudies.findIndex(
      (caseStudy) => caseStudy.id === focusedCaseId,
    );
  }, [focusedCaseId]);

  useEffect(() => {
    if (!enteringCaseId) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      navigate(`/scenario/${enteringCaseId}`, {
        state: { fromLanding: true },
      });
    }, ENTER_WORLD_DURATION_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [enteringCaseId, navigate]);

  const toggleActivePanel = (caseId: SimulationCaseId) => {
    if (isTransitioning) {
      return;
    }

    setActiveCaseId((current) => (current === caseId ? null : caseId));
  };

  const beginWorldEntry = (caseId: SimulationCaseId) => {
    if (isTransitioning) {
      return;
    }

    setActiveCaseId(caseId);
    setEnteringCaseId(caseId);
  };

  return (
    <main className={styles.page}>
      <motion.div
        className={styles.topbar}
        initial={isReturningFromWorld ? { opacity: 0, y: -22 } : false}
        animate={{
          opacity: isTransitioning ? 0 : 1,
          y: isTransitioning ? -18 : 0,
        }}
        transition={{
          duration: isReturningFromWorld ? 0.58 : 0.34,
          ease: PANEL_EASE,
        }}
      >
        <div className={styles.brandLockup}>
          <Logo className={styles.brandLogo} />
          <p className={styles.kicker}>Ocean Simulation Case Selection</p>
        </div>
      </motion.div>

      <motion.section
        className={styles.caseGrid}
        aria-label="Simulation case studies"
        initial={
          isReturningFromWorld
            ? { opacity: 0, scale: 1.05, filter: "blur(8px)" }
            : false
        }
        animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
        transition={{
          duration: isReturningFromWorld ? 0.66 : 0.12,
          ease: PANEL_EASE,
        }}
      >
        {simulationCaseStudies.map((caseStudy, index) => {
          const isFocused = focusedCaseId === caseStudy.id;
          const isEnteringPanel = enteringCaseId === caseStudy.id;
          const isLeavingPanel = isTransitioning && !isEnteringPanel;
          const panelFlexGrow = isTransitioning
            ? isEnteringPanel
              ? 7.6
              : 0.0001
            : hasFocusedCase
              ? isFocused
                ? 2.12
                : 0.44
              : 1;

          const panelTranslateX =
            isLeavingPanel && focusedCaseIndex >= 0
              ? index < focusedCaseIndex
                ? -92
                : 92
              : 0;

          const panelOpacity = isLeavingPanel ? 0 : 1;

          const panelClassName = [
            styles.casePanel,
            resolveCaseToneClass(caseStudy.id),
            isFocused ? styles.casePanelActive : "",
            hasFocusedCase && !isFocused ? styles.casePanelCompressed : "",
            isLeavingPanel ? styles.casePanelLeaving : "",
            isEnteringPanel ? styles.casePanelEntering : "",
          ]
            .filter(Boolean)
            .join(" ");

          return (
            <motion.article
              key={caseStudy.id}
              layout
              className={panelClassName}
              onClick={() => {
                toggleActivePanel(caseStudy.id);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  toggleActivePanel(caseStudy.id);
                }
              }}
              role="button"
              aria-label={caseStudy.seaName}
              tabIndex={isTransitioning ? -1 : 0}
              initial={false}
              animate={{
                flexGrow: panelFlexGrow,
                opacity: panelOpacity,
                x: panelTranslateX,
              }}
              transition={{
                layout: {
                  duration: isTransitioning ? 0.7 : 0.96,
                  ease: PANEL_EASE,
                },
                flexGrow: {
                  duration: isTransitioning ? 0.7 : 0.96,
                  ease: PANEL_EASE,
                },
                x: { duration: 0.56, ease: PANEL_EASE },
                opacity: { duration: 0.42, ease: PANEL_EASE },
              }}
            >
              <motion.video
                className={styles.caseVideo}
                src={caseStudy.videoSrc}
                muted
                loop
                autoPlay
                playsInline
                onLoadedMetadata={(event) => {
                  event.currentTarget.playbackRate = caseStudy.playbackRate;
                }}
                initial={false}
                animate={{
                  scale: isEnteringPanel
                    ? 1.22
                    : isFocused
                      ? 1.11
                      : hasFocusedCase
                        ? 1
                        : 1.02,
                }}
                transition={{
                  duration: isTransitioning ? 0.72 : 1.06,
                  ease: PANEL_EASE,
                }}
              />
              <div className={styles.caseOverlay} />

              <div className={styles.minimalCopy}>
                <h2>{caseStudy.seaName}</h2>
                <p>{caseStudy.subtitle}</p>
              </div>

              <div className={styles.expandedCopy}>
                <h3>{caseStudy.simulationTitle}</h3>
                <p>{caseStudy.description}</p>
              </div>

              <div className={styles.centerActions}>
                <Button
                  type="button"
                  variant="primaryFilled"
                  className={styles.actionButton}
                  onClick={(event) => {
                    event.stopPropagation();
                    beginWorldEntry(caseStudy.id);
                  }}
                  disabled={isTransitioning}
                >
                  Explore Scenario
                </Button>
                <Button
                  type="button"
                  variant="primaryOutlined"
                  className={styles.actionButton}
                  onClick={(event) => {
                    event.stopPropagation();
                  }}
                  disabled={isTransitioning}
                >
                  View Existing Simulations
                </Button>
              </div>
            </motion.article>
          );
        })}
      </motion.section>
    </main>
  );
};

export default SimulationCaseSelectionPage;
