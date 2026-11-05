import SessionMenu from "../../features/auth/SessionMenu";
import { Button } from "@mantine/core";
import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Logo from "../../components/Logo/Logo";
import {
  simulationCaseStudies,
  type SimulationCaseId,
} from "../../data/simulationCases";
import { useAutoplayVideo } from "../../hooks/useAutoplayVideo";
import OceanDiveIntro from "./components/OceanDiveIntro/OceanDiveIntro";
import styles from "./SimulationCaseSelectionPage.module.css";

const ENTER_WORLD_DURATION_MS = 700;
const INTRO_DURATION_MS = 3300;
const INTRO_REVEAL_LEAD_MS = 950;
const INTRO_SEEN_SESSION_KEY = "surimi:ocean-intro-seen";
const PANEL_EASE = [0.22, 1, 0.36, 1] as const;

const resolveCaseToneClass = (caseId: SimulationCaseId) => {
  if (caseId === "northwestern-mediterranean") {
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

type CasePanelVideoProps = {
  src: string;
  playbackRate: number;
  isPlaybackEnabled: boolean;
  scale: number;
  transitionDuration: number;
};

const getNavigationType = () => {
  if (typeof window === "undefined") {
    return null;
  }

  const navigationEntries = window.performance.getEntriesByType("navigation");
  if (navigationEntries.length > 0) {
    const navigationTiming =
      navigationEntries[0] as PerformanceNavigationTiming;
    return navigationTiming.type;
  }

  const legacyNavigation = window.performance.navigation;
  if (!legacyNavigation) {
    return null;
  }

  if (legacyNavigation.type === 1) {
    return "reload";
  }
  if (legacyNavigation.type === 2) {
    return "back_forward";
  }
  return "navigate";
};

const shouldPlayOceanIntro = (isReturningFromWorld: boolean) => {
  if (typeof window === "undefined") {
    return false;
  }

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return false;
  }

  const navigationType = getNavigationType();
  if (isReturningFromWorld || navigationType === "back_forward") {
    return false;
  }

  if (navigationType === "reload") {
    return true;
  }

  if (window.sessionStorage.getItem(INTRO_SEEN_SESSION_KEY) === "1") {
    return false;
  }

  return true;
};

const CasePanelVideo = ({
  src,
  playbackRate,
  isPlaybackEnabled,
  scale,
  transitionDuration,
}: CasePanelVideoProps) => {
  const [videoElement, setVideoElement] = useState<HTMLVideoElement | null>(
    null,
  );

  useAutoplayVideo(videoElement, { playbackRate, enabled: isPlaybackEnabled });

  return (
    <motion.video
      ref={setVideoElement}
      className={styles.caseVideo}
      preload="auto"
      muted
      loop
      autoPlay
      playsInline
      disablePictureInPicture
      initial={false}
      animate={{ scale }}
      transition={{
        duration: transitionDuration,
        ease: PANEL_EASE,
      }}
    >
      <source src={src} type="video/mp4" />
    </motion.video>
  );
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

  const visibleActiveCaseId = activeCaseId;

  const focusedCaseId = enteringCaseId ?? visibleActiveCaseId;
  const hasFocusedCase = Boolean(focusedCaseId);
  const isTransitioning = enteringCaseId !== null;
  const isReturningFromWorld = Boolean(
    (location.state as SimulationCaseSelectionRouteState | null)?.fromWorld,
  );
  const [shouldPlayIntro] = useState(() => {
    return shouldPlayOceanIntro(isReturningFromWorld);
  });
  const [isIntroRunning, setIsIntroRunning] = useState(shouldPlayIntro);
  const [isLandingRevealing, setIsLandingRevealing] =
    useState(!shouldPlayIntro);

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

  useEffect(() => {
    if (!shouldPlayIntro) {
      return;
    }

    window.sessionStorage.setItem(INTRO_SEEN_SESSION_KEY, "1");

    const revealTimeoutId = window.setTimeout(
      () => {
        setIsLandingRevealing(true);
      },
      Math.max(INTRO_DURATION_MS - INTRO_REVEAL_LEAD_MS, 0),
    );

    const finishTimeoutId = window.setTimeout(() => {
      setIsIntroRunning(false);
    }, INTRO_DURATION_MS);

    return () => {
      window.clearTimeout(revealTimeoutId);
      window.clearTimeout(finishTimeoutId);
    };
  }, [shouldPlayIntro]);

  const isLandingVisible = !isIntroRunning || isLandingRevealing;
  const isInteractionLocked = isTransitioning || isIntroRunning;

  const toggleActivePanel = (caseId: SimulationCaseId) => {
    if (isInteractionLocked) {
      return;
    }

    setActiveCaseId((current) => (current === caseId ? null : caseId));
  };

  const beginWorldEntry = (caseId: SimulationCaseId) => {
    if (isInteractionLocked) {
      return;
    }

    setActiveCaseId(caseId);
    setEnteringCaseId(caseId);
  };

  const viewExistingScenarios = (caseId: SimulationCaseId) => {
    if (isInteractionLocked) {
      return;
    }

    navigate(`/scenario-runs/${caseId}`);
  };

  return (
    <main className={styles.page}>
      {isIntroRunning && <OceanDiveIntro durationMs={INTRO_DURATION_MS} />}

      <motion.div
        className={styles.topbar}
        initial={
          shouldPlayIntro ? { opacity: 0, y: 24, filter: "blur(14px)" } : false
        }
        animate={{
          opacity: isTransitioning ? 0 : isLandingVisible ? 1 : 0,
          y: isTransitioning ? -18 : isLandingVisible ? 0 : 20,
          filter: isLandingVisible ? "blur(0px)" : "blur(14px)",
        }}
        transition={{
          duration: shouldPlayIntro ? 1.06 : 0.34,
          ease: PANEL_EASE,
        }}
      >
        <div className={styles.brandLockup}>
          <Logo className={styles.brandLogo} />
          <p className={styles.kicker}>MODEL USER INTERFACE</p>
        </div>
        <SessionMenu />
      </motion.div>

      <motion.section
        className={[
          styles.caseGrid,
          isInteractionLocked ? styles.caseGridLocked : "",
        ]
          .filter(Boolean)
          .join(" ")}
        aria-label="Scenario case studies"
        initial={
          shouldPlayIntro
            ? { opacity: 0.26, scale: 1.04, filter: "blur(8px)" }
            : false
        }
        animate={{
          opacity: isLandingVisible ? 1 : 0,
          scale: isLandingVisible ? 1 : 1.06,
          filter: isLandingVisible ? "blur(0px)" : "blur(18px)",
        }}
        transition={{
          duration: shouldPlayIntro ? 1.08 : 0.12,
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
              tabIndex={isInteractionLocked ? -1 : 0}
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
              <CasePanelVideo
                src={caseStudy.videoSrc}
                playbackRate={caseStudy.playbackRate}
                isPlaybackEnabled={isLandingVisible}
                scale={
                  isEnteringPanel
                    ? 1.22
                    : isFocused
                      ? 1.11
                      : hasFocusedCase
                        ? 1
                        : 1.02
                }
                transitionDuration={isTransitioning ? 0.72 : 1.06}
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
                  disabled={isInteractionLocked}
                >
                  Explore Scenario
                </Button>
                <Button
                  type="button"
                  variant="primaryOutlined"
                  className={styles.actionButton}
                  onClick={(event) => {
                    event.stopPropagation();
                    viewExistingScenarios(caseStudy.id);
                  }}
                  disabled={isInteractionLocked}
                >
                  Compare Scenarios
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
