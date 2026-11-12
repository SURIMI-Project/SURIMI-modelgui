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
import { motion } from "framer-motion";
import { useLayoutEffect, useState } from "react";
import { resolveDashboardSelection } from "./data/dashboardSelection";
import CatchMsyChart from "./components/CatchMsyChart/CatchMsyChart";
import ExploitationChart from "./components/ExploitationChart/ExploitationChart";
import KobeChart from "./components/KobeChart/KobeChart";
import StockSizeChart from "./components/StockSizeChart/StockSizeChart";
import { europeanHakeWestMediterraneanNorthSpain } from "./data/mockData";
import Logo from "./components/Logo/Logo";
import styles from "./CmsyOutputPage.module.css";

const MotionDiv = motion.div;
const SELECTION_STORAGE_KEY = "cmsy-output-selection";

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

const CmsyOutputPage = () => {
  const [selectionParams] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.has("caseStudy") || params.has("fish")) return params;
    try {
      return new URLSearchParams(sessionStorage.getItem(SELECTION_STORAGE_KEY) ?? "");
    } catch {
      return params;
    }
  });

  useLayoutEffect(() => {
    const url = new URL(window.location.href);
    if (!url.searchParams.has("caseStudy") && !url.searchParams.has("fish")) return;
    const savedParams = new URLSearchParams();
    for (const key of ["caseStudy", "fish"]) {
      const value = selectionParams.get(key);
      if (value !== null) savedParams.set(key, value);
      url.searchParams.delete(key);
    }
    try {
      sessionStorage.setItem(SELECTION_STORAGE_KEY, savedParams.toString());
    } catch {
      // The current render still works when browser storage is unavailable.
    }
    // Keep router history state and other URL details without triggering navigation.
    window.history.replaceState(window.history.state, "", url);
  }, [selectionParams]);

  useLayoutEffect(() => {
    const previousRestoration = window.history.scrollRestoration;
    window.history.scrollRestoration = "manual";
    const resetScroll = () => window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    resetScroll();
    // Reset after the initial layout and when a cached document is restored.
    const frame = window.requestAnimationFrame(resetScroll);
    window.addEventListener("pageshow", resetScroll);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("pageshow", resetScroll);
      window.history.scrollRestoration = previousRestoration;
    };
  }, []);

  const selection = resolveDashboardSelection(selectionParams);
  // Selection personalizes the demo; calculated indicators remain sample data.
  const stock = {
    ...europeanHakeWestMediterraneanNorthSpain,
    name: `${selection.fish.name} (${selection.fish.code})`,
    sciName: selection.fish.scientificName,
    subregion: selection.caseStudy,
  };
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

  const groupViewport = { once: true, amount: 0.18 };

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

  return (
    <>
      <Container
        size="xl"
        py={{ base: "md", md: "xl" }}
        className={styles["landing-shell"]}
      >
        <MotionDiv
          initial={{ opacity: 0, y: 24 }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          transition={{ duration: 0.45 }}
        >
          <Stack gap={64}>
            <MotionDiv {...riseInOnView(0)}>
              <Paper
                className={styles["hero-panel"]}
                radius="xl"
                p={{ base: "md", md: "lg" }}
              >
                <Box className={styles["hero-layout"]}>
                  <Stack gap="xs" className={styles["hero-left-column"]}>
                    <Logo className={styles["hero-logo"]} />
                    <Badge size="lg" className={styles["hero-badge"]}>
                      SURIMI pilot stock
                    </Badge>
                  </Stack>

                  <Box className={styles["hero-right-column"]}>
                    <Group
                      justify="flex-end"
                      className={styles["hero-state-row"]}
                    >
                      <Paper
                        className={styles["hero-highlight"]}
                        radius="lg"
                        p="sm"
                        withBorder
                      >
                        <Text size="xs" fw={700} c="dimmed">
                          Current state
                        </Text>
                        <Text className={styles["hero-highlight-value"]} mt={2}>
                          {quadrantLabel}
                        </Text>
                        <Text size="sm" mt={4}>
                          B/BMSY {latestBRatio.toFixed(2)} · F/FMSY{" "}
                          {latestFRatio.toFixed(2)}
                        </Text>
                      </Paper>
                    </Group>

                    <Title order={1} className={styles["hero-title"]}>
                      {stock.name} dashboard
                    </Title>
                    <Text className={styles["hero-copy"]}>
                      {stock.sciName} · {stock.subregion}
                    </Text>
                    <Text className={styles["hero-subcopy"]}>
                      Combined indicators for catch, stock state, exploitation
                      pressure, and management quadrant trajectories.
                    </Text>
                  </Box>
                </Box>
              </Paper>
            </MotionDiv>

            <MotionDiv {...riseInOnView(0.14)}>
              <Paper
                className={styles["terms-explainer"]}
                withBorder
                radius="lg"
                p="md"
              >
                <Text className={styles["terms-title"]}>
                  What these terms mean
                </Text>
                <Box component="ul" className={styles["terms-list"]}>
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
                <Paper
                  className={styles["metric-card"]}
                  withBorder
                  radius="lg"
                  p="md"
                >
                  <Text className={styles["metric-label"]}>
                    MSY (sustainable catch)
                  </Text>
                  <Text className={styles["metric-value"]}>
                    {stock.msyBsm.toFixed(2)}
                  </Text>
                  <Text size="sm" c="dimmed">
                    1000 tonnes/year
                  </Text>
                </Paper>
                <Paper
                  className={styles["metric-card"]}
                  withBorder
                  radius="lg"
                  p="md"
                >
                  <Text className={styles["metric-label"]}>MSY range</Text>
                  <Text className={styles["metric-value"]}>
                    {stock.lclMsyBsm.toFixed(2)} - {stock.uclMsyBsm.toFixed(2)}
                  </Text>
                  <Text size="sm" c="dimmed">
                    Bayesian credible bounds
                  </Text>
                </Paper>
                <Paper
                  className={styles["metric-card"]}
                  withBorder
                  radius="lg"
                  p="md"
                >
                  <Text className={styles["metric-label"]}>Catch coverage</Text>
                  <Text className={styles["metric-value"]}>
                    {firstObserved?.year}-{lastObserved?.year}
                  </Text>
                  <Text size="sm" c="dimmed">
                    {observed.length} observed points
                  </Text>
                </Paper>
                <Paper
                  className={styles["metric-card"]}
                  withBorder
                  radius="lg"
                  p="md"
                >
                  <Text className={styles["metric-label"]}>Catch/MSY</Text>
                  <Text className={styles["metric-value"]}>
                    {catchToMsy.toFixed(2)}
                  </Text>
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

      <footer className={styles["site-footer"]}>
        <Container size="xl" className={styles["site-footer-inner"]}>
          <Group justify="space-between" align="center" gap="xl">
            <Box className={styles["site-footer-brand"]}>
              <Logo className={styles["site-footer-logo"]} />
              <Box>
                <Text className={styles["site-footer-title"]}>
                  SURIMI Fisheries Dashboard
                </Text>
                <Text className={styles["site-footer-description"]}>
                  Decision-support views for catch, biomass, exploitation, and
                  management trajectories.
                </Text>
              </Box>
            </Box>

            <a
              href="https://www.surimi-project.eu/"
              className={styles["site-footer-main-link"]}
              target="_blank"
              rel="noreferrer"
            >
              Visit SURIMI main site
            </a>
          </Group>

          <Text className={styles["site-footer-bottom"]}>
            © {currentYear} SURIMI. Built for fisheries decision support.
          </Text>
        </Container>
      </footer>
    </>
  );
};

export default CmsyOutputPage;
