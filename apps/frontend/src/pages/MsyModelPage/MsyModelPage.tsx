import { coreConcepts } from "../../../mock-data/content/cmsyIntroduction";
import Badge from "../../components/ui/Tag/Tag";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import CatchMsyChart from "./components/CatchMsyChart/CatchMsyChart";
import ExploitationChart from "./components/ExploitationChart/ExploitationChart";
import Intro3DScene from "./components/Intro3DScene/Intro3DScene";
import KobeChart from "./components/KobeChart/KobeChart";
import StockSizeChart from "./components/StockSizeChart/StockSizeChart";
import { europeanHakeWestMediterraneanNorthSpain } from "../../../mock-data/cmsy";
import Logo from "../../components/Logo/Logo";
import styles from "./MsyModelPage.module.css";

const MotionDiv = motion.div;

const normalizeBiomassValue = (rawBiomass: number, bmsy: number) => {
  let normalized = rawBiomass;
  while (normalized / bmsy > 2) {
    normalized /= 10;
  }
  return normalized;
};

const normalizeExploitationValue = (raw: number) => {
  let value = raw;
  while (value > 4.5) {
    value /= 10;
  }
  return value;
};

const MsyModelPage = () => {
  const stock = europeanHakeWestMediterraneanNorthSpain;
  const introRef = useRef<HTMLElement | null>(null);
  const [introProgress, setIntroProgress] = useState(0);
  const currentYear = new Date().getFullYear();

  const observed = stock.catches.filter((point) => point.catchKtonnes !== null);
  const missingCount = stock.catches.length - observed.length;
  const firstObserved = observed[0];
  const lastObserved = observed[observed.length - 1];

  const latestCatch = lastObserved?.catchKtonnes ?? 0;
  const catchToMsy = stock.msyBsm > 0 ? latestCatch / stock.msyBsm : 0;

  const latestStockPoint = [...stock.stockSize.series]
    .reverse()
    .find(
      (point) =>
        point.biomass !== null &&
        point.biomass !== stock.stockSize.unavailableRawValue,
    );

  const latestExploitationPoint = [...stock.exploitation.series]
    .reverse()
    .find(
      (point) =>
        point.ratioRaw !== null &&
        point.ratioRaw !== stock.exploitation.unavailableRawValue,
    );

  let latestBRatio = stock.stockSize.defaultRatio;

  if (
    latestStockPoint?.biomass !== null &&
    latestStockPoint?.biomass !== undefined
  ) {
    latestBRatio =
      normalizeBiomassValue(latestStockPoint.biomass, stock.stockSize.bmsy) /
      stock.stockSize.bmsy;
  }

  let latestFRatio = stock.exploitation.defaultRatio;
  if (
    latestExploitationPoint?.ratioRaw !== null &&
    latestExploitationPoint?.ratioRaw !== undefined
  ) {
    latestFRatio = normalizeExploitationValue(latestExploitationPoint.ratioRaw);
  }

  const quadrantLabel =
    latestBRatio >= 1 && latestFRatio <= 1
      ? "Healthy + sustainable pressure"
      : latestBRatio >= 1 && latestFRatio > 1
        ? "High pressure risk"
        : latestBRatio < 1 && latestFRatio <= 1
          ? "Recovery zone"
          : "Overfished and overfishing";

  useEffect(() => {
    const updateProgress = () => {
      const section = introRef.current;
      if (!section) {
        return;
      }

      const totalScrollable = Math.max(
        section.offsetHeight - window.innerHeight,
        1,
      );

      const top = section.getBoundingClientRect().top;
      const consumed = Math.min(Math.max(-top, 0), totalScrollable);
      const next = consumed / totalScrollable;
      setIntroProgress(next);
    };

    updateProgress();
    window.addEventListener("scroll", updateProgress, { passive: true });
    window.addEventListener("resize", updateProgress);

    return () => {
      window.removeEventListener("scroll", updateProgress);
      window.removeEventListener("resize", updateProgress);
    };
  }, []);

  const introTitleOpacity = Math.max(0, 1 - introProgress * 1.2);
  const introSubtitleOpacity = Math.max(0, 1 - introProgress * 1.5);
  const dashboardReveal = Math.min(
    Math.max((introProgress - 0.72) / 0.2, 0),
    1,
  );
  const dashboardUnlocked = dashboardReveal >= 0.98;
  const groupViewport = { once: true, amount: 0.18 };

  const riseIn = (delay = 0) => ({
    initial: { opacity: 0, y: 52 },
    animate: dashboardUnlocked ? { opacity: 1, y: 0 } : { opacity: 0, y: 52 },
    transition: {
      duration: 1.05,
      ease: [0.16, 1, 0.3, 1] as const,
      delay,
    },
  });

  const riseInOnView = (delay = 0) => ({
    initial: { opacity: 0, y: 52 },
    whileInView: { opacity: 1, y: 0 },
    viewport: groupViewport,
    transition: {
      duration: 1.05,
      ease: [0.16, 1, 0.3, 1] as const,
      delay,
    },
  });

  const activeConceptIndex =
    introProgress < 0.16 || introProgress > 0.9
      ? -1
      : introProgress < 0.42
        ? 0
        : introProgress < 0.67
          ? 1
          : 2;

  const activeConcept =
    activeConceptIndex >= 0 ? coreConcepts[activeConceptIndex] : null;

  return (
    <>
      <section
        ref={introRef}
        className={styles["intro-scroll-section"]}
        id="top"
      >
        <div className={styles["intro-sticky-panel"]}>
          <Intro3DScene progress={introProgress} />

          <div className={styles["intro-overlay"]}>
            <div className={styles["intro-concepts-shell"]} aria-hidden="true">
              <AnimatePresence mode="wait">
                {activeConcept ? (
                  <motion.div
                    key={activeConcept}
                    className={styles["intro-concept"]}
                    initial={{ opacity: 0, x: 70, filter: "blur(7px)" }}
                    animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
                    exit={{ opacity: 0, x: 70, filter: "blur(7px)" }}
                    transition={{
                      duration: 0.42,
                      ease: [0.22, 1, 0.36, 1],
                    }}
                  >
                    <span className={styles["intro-concept-kicker"]}>
                      Core concept {activeConceptIndex + 1}
                    </span>
                    <span className={styles["intro-concept-text"]}>
                      {activeConcept}
                    </span>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>

            <Logo className={styles["intro-logo"]} />
            <Badge className={styles["intro-kicker"]}>
              SURIMI digital twin experience
            </Badge>
            <h1
              style={{ opacity: introTitleOpacity }}
              className={styles["intro-title"]}
            >
              Ocean intelligence, then stock diagnostics
            </h1>
            <p
              style={{ opacity: introSubtitleOpacity }}
              className={styles["intro-subtitle"]}
            >
              Scroll to view the fisheries decision dashboard.
            </p>
            <div className={styles["intro-progress-track"]}>
              <span
                className={styles["intro-progress-fill"]}
                style={{ transform: `scaleX(${introProgress})` }}
              />
            </div>
            <p className={styles["intro-progress-label"]}>
              {introProgress < 0.98
                ? `Loading dashboard ${Math.round(introProgress * 100)}%`
                : "Dashboard unlocked. Keep scrolling."}
            </p>
          </div>
        </div>
      </section>

      <div
        className={[styles["landing-shell"], styles.containerLayout1]
          .filter(Boolean)
          .join(" ")}
      >
        <MotionDiv
          initial={{ opacity: 0, y: 24 }}
          animate={{
            opacity: dashboardReveal,
            y: 18 - dashboardReveal * 18,
          }}
          transition={{ duration: 0.45 }}
        >
          <div className={styles.stackLayout2}>
            <MotionDiv {...riseIn(0)}>
              <div
                className={[styles["hero-panel"], styles.paperLayout3]
                  .filter(Boolean)
                  .join(" ")}
              >
                <div className={styles["hero-layout"]}>
                  <div
                    className={[styles["hero-left-column"], styles.stackLayout4]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    <Logo className={styles["hero-logo"]} />
                    <Badge className={styles["hero-badge"]}>
                      SURIMI pilot stock
                    </Badge>
                  </div>

                  <div className={styles["hero-right-column"]}>
                    <div
                      className={[styles["hero-state-row"], styles.groupLayout5]
                        .filter(Boolean)
                        .join(" ")}
                    >
                      <div
                        className={[
                          styles["hero-highlight"],
                          styles.paperLayout6,
                        ]
                          .filter(Boolean)
                          .join(" ")}
                      >
                        <p className={styles.textLayout7}>Current state</p>
                        <p
                          className={[
                            styles["hero-highlight-value"],
                            styles.textLayout8,
                          ]
                            .filter(Boolean)
                            .join(" ")}
                        >
                          {quadrantLabel}
                        </p>
                        <p className={styles.textLayout9}>
                          B/BMSY {latestBRatio.toFixed(2)} · F/FMSY{" "}
                          {latestFRatio.toFixed(2)}
                        </p>
                      </div>
                    </div>

                    <h1 className={styles["hero-title"]}>
                      {stock.name} dashboard
                    </h1>
                    <p className={styles["hero-copy"]}>
                      {stock.sciName} · {stock.subregion} · {stock.region}
                    </p>
                    <p className={styles["hero-subcopy"]}>
                      Combined indicators for catch, stock state, exploitation
                      pressure, and management quadrant trajectories.
                    </p>
                  </div>
                </div>
              </div>
            </MotionDiv>

            <MotionDiv {...riseInOnView(0.14)}>
              <div
                className={[styles["terms-explainer"], styles.paperLayout10]
                  .filter(Boolean)
                  .join(" ")}
              >
                <p className={styles["terms-title"]}>What these terms mean</p>
                <ul className={styles["terms-list"]}>
                  <li>
                    <strong>MSY</strong> is the estimated sustainable catch
                    level each year.
                  </li>
                  <li>
                    <strong>B/BMSY</strong> compares stock biomass to the target
                    biomass level.
                  </li>
                  <li>
                    <strong>F/FMSY</strong> compares fishing pressure to the
                    sustainable pressure level.
                  </li>
                </ul>
              </div>
            </MotionDiv>

            <MotionDiv {...riseInOnView(0.28)}>
              <div id="indicator-metrics" className={styles.simpleGridLayout11}>
                <div
                  className={[styles["metric-card"], styles.paperLayout12]
                    .filter(Boolean)
                    .join(" ")}
                >
                  <p className={styles["metric-label"]}>
                    MSY (sustainable catch)
                  </p>
                  <p className={styles["metric-value"]}>
                    {stock.msyBsm.toFixed(2)}
                  </p>
                  <p className={styles.textLayout13}>1000 tonnes/year</p>
                </div>
                <div
                  className={[styles["metric-card"], styles.paperLayout14]
                    .filter(Boolean)
                    .join(" ")}
                >
                  <p className={styles["metric-label"]}>MSY range</p>
                  <p className={styles["metric-value"]}>
                    {stock.lclMsyBsm.toFixed(2)} - {stock.uclMsyBsm.toFixed(2)}
                  </p>
                  <p className={styles.textLayout15}>
                    Bayesian credible bounds
                  </p>
                </div>
                <div
                  className={[styles["metric-card"], styles.paperLayout16]
                    .filter(Boolean)
                    .join(" ")}
                >
                  <p className={styles["metric-label"]}>Catch coverage</p>
                  <p className={styles["metric-value"]}>
                    {firstObserved?.year}-{lastObserved?.year}
                  </p>
                  <p className={styles.textLayout17}>
                    {observed.length} observed points
                  </p>
                </div>
                <div
                  className={[styles["metric-card"], styles.paperLayout18]
                    .filter(Boolean)
                    .join(" ")}
                >
                  <p className={styles["metric-label"]}>Catch/MSY</p>
                  <p className={styles["metric-value"]}>
                    {catchToMsy.toFixed(2)}
                  </p>
                  <p className={styles.textLayout19}>
                    {missingCount} missing future points
                  </p>
                </div>
              </div>
            </MotionDiv>

            <MotionDiv {...riseInOnView(0.42)}>
              <div id="indicator-charts" className={styles.simpleGridLayout20}>
                <CatchMsyChart stock={stock} />
                <StockSizeChart stock={stock} />
                <ExploitationChart stock={stock} />
                <KobeChart stock={stock} />
              </div>
            </MotionDiv>
          </div>
        </MotionDiv>
      </div>

      <footer className={styles["site-footer"]}>
        <div
          className={[styles["site-footer-inner"], styles.containerLayout21]
            .filter(Boolean)
            .join(" ")}
        >
          <div className={styles.groupLayout22}>
            <div className={styles["site-footer-brand"]}>
              <Logo className={styles["site-footer-logo"]} />
              <div>
                <p className={styles["site-footer-title"]}>
                  SURIMI Fisheries Dashboard
                </p>
                <p className={styles["site-footer-description"]}>
                  Decision-support views for catch, biomass, exploitation, and
                  management trajectories.
                </p>
              </div>
            </div>

            <a
              href="https://www.surimi-project.eu/"
              className={styles["site-footer-main-link"]}
              target="_blank"
              rel="noreferrer"
            >
              Visit SURIMI main site
            </a>
          </div>

          <p className={styles["site-footer-bottom"]}>
            © {currentYear} SURIMI. Built for fisheries decision support.
          </p>
        </div>
      </footer>
    </>
  );
};

export default MsyModelPage;
