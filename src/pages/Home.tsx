import {
  Badge,
  Box,
  Container,
  Group,
  Paper,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import CatchMsyChart from "../components/CatchMsyChart";
import ExploitationChart from "../components/ExploitationChart";
import Intro3DScene from "../components/Intro3DScene";
import KobeChart from "../components/KobeChart";
import StockSizeChart from "../components/StockSizeChart";
import { europeanHakeWestMediterraneanNorthSpain } from "../data/mockData";

const MotionDiv = motion.div;

function normalizeBiomass(rawBiomass: number, bmsy: number) {
  let normalized = rawBiomass;
  while (normalized / bmsy > 2) {
    normalized /= 10;
  }
  return normalized;
}

function normalizeExploitation(raw: number) {
  let value = raw;
  while (value > 4.5) {
    value /= 10;
  }
  return value;
}

function Home() {
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
      normalizeBiomass(latestStockPoint.biomass, stock.stockSize.bmsy) /
      stock.stockSize.bmsy;
  }

  let latestFRatio = stock.exploitation.defaultRatio;
  if (
    latestExploitationPoint?.ratioRaw !== null &&
    latestExploitationPoint?.ratioRaw !== undefined
  ) {
    latestFRatio = normalizeExploitation(latestExploitationPoint.ratioRaw);
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

  const coreConcepts = [
    "Sustainable catch intelligence",
    "Stock health monitoring",
    "Management-ready decisions",
  ];

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
      <section ref={introRef} className="intro-scroll-section" id="top">
        <div className="intro-sticky-panel">
          <Intro3DScene progress={introProgress} />

          <div className="intro-overlay">
            <div className="intro-concepts-shell" aria-hidden="true">
              <AnimatePresence mode="wait">
                {activeConcept ? (
                  <motion.div
                    key={activeConcept}
                    className="intro-concept"
                    initial={{ opacity: 0, x: 70, filter: "blur(7px)" }}
                    animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
                    exit={{ opacity: 0, x: 70, filter: "blur(7px)" }}
                    transition={{
                      duration: 0.42,
                      ease: [0.22, 1, 0.36, 1],
                    }}
                  >
                    <span className="intro-concept-kicker">
                      Core concept {activeConceptIndex + 1}
                    </span>
                    <span className="intro-concept-text">{activeConcept}</span>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>

            <div className="intro-brand">
              <img
                src="/surimiLogo.svg"
                alt="SURIMI logo"
                className="intro-logo"
              />
            </div>
            <Badge size="lg" className="intro-kicker">
              SURIMI digital twin experience
            </Badge>
            <Title
              className="intro-title"
              style={{ opacity: introTitleOpacity }}
            >
              Ocean intelligence, then stock diagnostics
            </Title>
            <Text
              className="intro-subtitle"
              style={{ opacity: introSubtitleOpacity }}
            >
              Scroll to view the fisheries decision dashboard.
            </Text>
            <div className="intro-progress-track">
              <span
                className="intro-progress-fill"
                style={{ transform: `scaleX(${introProgress})` }}
              />
            </div>
            <Text className="intro-progress-label">
              {introProgress < 0.98
                ? `Loading dashboard ${Math.round(introProgress * 100)}%`
                : "Dashboard unlocked. Keep scrolling."}
            </Text>
          </div>
        </div>
      </section>

      <Container
        size="xl"
        py={{ base: "md", md: "xl" }}
        className="landing-shell"
      >
        <MotionDiv
          initial={{ opacity: 0, y: 24 }}
          animate={{
            opacity: dashboardReveal,
            y: 18 - dashboardReveal * 18,
          }}
          transition={{ duration: 0.45 }}
        >
          <Stack gap={64}>
            <MotionDiv {...riseIn(0)}>
              <Paper
                className="hero-panel"
                radius="xl"
                p={{ base: "md", md: "lg" }}
              >
                <Box className="hero-layout">
                  <Stack gap="xs" className="hero-left-column">
                    <div className="hero-logo-frame">
                      <img
                        src="/surimiLogo.svg"
                        alt="SURIMI logo"
                        className="hero-logo"
                      />
                    </div>
                    <Badge size="lg" className="hero-badge">
                      SURIMI pilot stock
                    </Badge>
                  </Stack>

                  <Box className="hero-right-column">
                    <Group justify="flex-end" className="hero-state-row">
                      <Paper
                        className="hero-highlight"
                        radius="lg"
                        p="sm"
                        withBorder
                      >
                        <Text size="xs" fw={700} c="dimmed">
                          Current state
                        </Text>
                        <Text className="hero-highlight-value" mt={2}>
                          {quadrantLabel}
                        </Text>
                        <Text size="sm" mt={4}>
                          B/BMSY {latestBRatio.toFixed(2)} · F/FMSY{" "}
                          {latestFRatio.toFixed(2)}
                        </Text>
                      </Paper>
                    </Group>

                    <Title order={1} className="hero-title">
                      {stock.name} dashboard
                    </Title>
                    <Text className="hero-copy">
                      {stock.sciName} · {stock.subregion} · {stock.region}
                    </Text>
                    <Text className="hero-subcopy">
                      Combined indicators for catch, stock state, exploitation
                      pressure, and management quadrant trajectories.
                    </Text>
                  </Box>
                </Box>
              </Paper>
            </MotionDiv>

            <MotionDiv {...riseInOnView(0.14)}>
              <Paper className="terms-explainer" withBorder radius="lg" p="md">
                <Text className="terms-title">What these terms mean</Text>
                <Box component="ul" className="terms-list">
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
                </Box>
              </Paper>
            </MotionDiv>

            <MotionDiv {...riseInOnView(0.28)}>
              <SimpleGrid
                cols={{ base: 1, sm: 2, lg: 4 }}
                spacing="md"
                id="indicator-metrics"
              >
                <Paper className="metric-card" withBorder radius="lg" p="md">
                  <Text className="metric-label">MSY (sustainable catch)</Text>
                  <Text className="metric-value">
                    {stock.msyBsm.toFixed(2)}
                  </Text>
                  <Text size="sm" c="dimmed">
                    1000 tonnes/year
                  </Text>
                </Paper>
                <Paper className="metric-card" withBorder radius="lg" p="md">
                  <Text className="metric-label">MSY range</Text>
                  <Text className="metric-value">
                    {stock.lclMsyBsm.toFixed(2)} - {stock.uclMsyBsm.toFixed(2)}
                  </Text>
                  <Text size="sm" c="dimmed">
                    Bayesian credible bounds
                  </Text>
                </Paper>
                <Paper className="metric-card" withBorder radius="lg" p="md">
                  <Text className="metric-label">Catch coverage</Text>
                  <Text className="metric-value">
                    {firstObserved?.year}-{lastObserved?.year}
                  </Text>
                  <Text size="sm" c="dimmed">
                    {observed.length} observed points
                  </Text>
                </Paper>
                <Paper className="metric-card" withBorder radius="lg" p="md">
                  <Text className="metric-label">Catch/MSY</Text>
                  <Text className="metric-value">{catchToMsy.toFixed(2)}</Text>
                  <Text size="sm" c="dimmed">
                    {missingCount} missing future points
                  </Text>
                </Paper>
              </SimpleGrid>
            </MotionDiv>

            <MotionDiv {...riseInOnView(0.42)}>
              <SimpleGrid
                id="indicator-charts"
                cols={{ base: 1, md: 2 }}
                spacing="lg"
                verticalSpacing="lg"
              >
                <CatchMsyChart stock={stock} />
                <StockSizeChart stock={stock} />
                <ExploitationChart stock={stock} />
                <KobeChart stock={stock} />
              </SimpleGrid>
            </MotionDiv>
          </Stack>
        </MotionDiv>
      </Container>

      <footer className="site-footer">
        <Container size="xl" className="site-footer-inner">
          <Group justify="space-between" align="center" gap="xl">
            <Box className="site-footer-brand">
              <img
                src="/surimiLogo.svg"
                alt="SURIMI logo"
                className="site-footer-logo"
              />
              <Box>
                <Text className="site-footer-title">
                  SURIMI Fisheries Dashboard
                </Text>
                <Text className="site-footer-description">
                  Decision-support views for catch, biomass, exploitation, and
                  management trajectories.
                </Text>
              </Box>
            </Box>

            <a
              href="https://www.surimi-project.eu/"
              className="site-footer-main-link"
              target="_blank"
              rel="noreferrer"
            >
              Visit SURIMI main site
            </a>
          </Group>

          <Text className="site-footer-bottom">
            © {currentYear} SURIMI. Built for fisheries decision support.
          </Text>
        </Container>
      </footer>
    </>
  );
}

export default Home;
