import { useEffect, useRef, useState } from "react";
import { Box, Button, Container, LoadingOverlay, Paper, Select, Stack, Text, Title } from "@mantine/core";
import { CategoryScale, Chart as ChartJS, Filler, Legend, LineElement, LinearScale, PointElement, Tooltip } from "chart.js";
import { useNavigate } from "react-router-dom";
import { Line } from "react-chartjs-2";
import catchCsv from "./catch_file.csv?raw";
import styles from "./CmsyInputPage.module.css";

ChartJS.register(CategoryScale, LinearScale, LineElement, PointElement, Tooltip, Filler, Legend);

const caseStudies = [
  { id: "northwestern-mediterranean-sea", name: "Northwestern Mediterranean Sea", image: "/sidemenu/northwesternseaItem.jpg" },
  { id: "aegean-sea", name: "Aegean Sea", image: "/sidemenu/aegeanItem.jpg" },
  { id: "anchovy-bay", name: "Anchovy Bay", image: "/sidemenu/anchovyItem.jpg" },
];
const species = [
  { value: "ALB", label: "Albacore (ALB)", scientificName: "Thunnus alalunga" },
  { value: "AMB", label: "Greater amberjack (AMB)", scientificName: "Seriola dumerili" },
  { value: "ANE", label: "European anchovy (ANE)", scientificName: "Engraulis encrasicolus" },
  { value: "HKE", label: "European hake (HKE)", scientificName: "Merluccius merluccius" },
  { value: "HOM", label: "Atlantic horse mackerel (HOM)", scientificName: "Trachurus trachurus" },
];

const catches = catchCsv.trim().split(/\r?\n/).slice(1).map((line) => {
  const [stock, year, catchValue] = line.split(",");
  return { stock, year: Number(year), catchTonnes: catchValue && catchValue !== "NA" ? Number(catchValue) : null };
}).filter((point) => Number.isFinite(point.year));

const CmsyInputPage = () => {
  const navigate = useNavigate();
  const [isRunning, setIsRunning] = useState(false);
  const runTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (runTimer.current !== null) clearTimeout(runTimer.current);
  }, []);
  const [caseStudy, setCaseStudy] = useState<string | null>(null);
  const [stockCode, setStockCode] = useState<string | null>(null);
  const selectedSpecies = species.find((fish) => fish.value === stockCode);
  const series = catches.filter((point) => point.stock === stockCode).sort((a, b) => a.year - b.year);

  const runScenario = () => {
    if (!caseStudy || !selectedSpecies || isRunning) return;
    setIsRunning(true);
    const params = new URLSearchParams({
      caseStudy: caseStudies.find((study) => study.name === caseStudy)!.id,
      fish: selectedSpecies.value,
    });
    runTimer.current = setTimeout(() => navigate(`/cmsy-output?${params.toString()}`), 2000);
  };

  return (
    <Container size="xl" className={styles.page} aria-busy={isRunning}>
      <LoadingOverlay visible={isRunning} className={styles.overlay} zIndex={3000} overlayProps={{ backgroundOpacity: 0.35, blur: 1 }} loaderProps={{ color: "#c64c36" }} />
      <Stack gap="md" className={styles.content} inert={isRunning}>

        <header className={styles.header}>
          <Text className={styles.eyebrow}>CMSY · Catch time series</Text>
          <Title order={1} mt={6}>Explore catch history</Title>
          <Text mt={6}>Choose a case study and fish species to explore annual catches.</Text>
        </header>
        <Paper className={styles.formCard} radius="lg" p={{ base: "md", sm: "xl" }} withBorder>
          <div className={styles.inputs}>
            <fieldset className={styles.caseFieldset} disabled={isRunning}>
              <legend className={styles.label}>Case Study</legend>
              <div className={styles.caseGrid}>
                {caseStudies.map((study) => (
                  <label key={study.name} className={`${styles.caseOption} ${caseStudy === study.name ? styles.caseSelected : ""}`}>
                    <input type="radio" name="case-study" value={study.name} checked={caseStudy === study.name} onChange={() => setCaseStudy(study.name)} />
                    <img src={study.image} alt="" className={styles.caseImage} />
                    <span className={styles.caseName}>{study.name}</span>
                    <span className={styles.radioMark} aria-hidden="true" />
                  </label>
                ))}
              </div>
            </fieldset>
            <Select disabled={isRunning} label="Fish species" placeholder="Select a fish species" data={species.map(({ value, label }) => ({ value, label }))} value={stockCode} onChange={setStockCode} size="md" classNames={{ root: styles.speciesField, input: styles.input, label: styles.label, dropdown: styles.dropdown, option: styles.option, section: styles.section }} />
          </div>
        </Paper>
        <Paper className={`${styles.card} ${styles.chartCard}`} radius="lg" p={{ base: "md", sm: "xl" }} withBorder aria-live="polite">
          {caseStudy && selectedSpecies ? (
            <>
              <div className={styles.chartHeading}>
                <Title order={2} className={styles.chartTitle}>{selectedSpecies.label} — annual catch</Title>
                <Text component="span" className={styles.chartContext}>{selectedSpecies.scientificName} · {caseStudy}</Text>
                <Text component="span" className={styles.chartMeta}>{series[0]?.year}–{series.at(-1)?.year}</Text>
              </div>
              <Box className={styles.chart}>
                <Line
                  aria-label={`Annual catch in tonnes for ${selectedSpecies.label}, ${caseStudy}`}
                  role="img"
                  data={{ labels: series.map((point) => String(point.year)), datasets: [{ label: "Catch (tonnes)", data: series.map((point) => point.catchTonnes), borderColor: "#c62427", backgroundColor: "rgba(198,36,39,0.1)", fill: true, tension: 0.25, pointRadius: 2, pointHoverRadius: 6, spanGaps: false }] }}
                  options={{ responsive: true, maintainAspectRatio: false, interaction: { mode: "index", intersect: false }, plugins: { tooltip: { callbacks: { title: (items) => `Year ${items[0]?.label}`, label: (context) => `Catch: ${context.parsed.y?.toLocaleString()} tonnes` } } }, scales: { x: { title: { display: true, text: "Year" }, grid: { color: "rgba(97,115,176,0.09)" }, ticks: { maxTicksLimit: 10 } }, y: { beginAtZero: true, title: { display: true, text: "Catch (tonnes/year)" }, grid: { color: "rgba(97,115,176,0.09)" } } } }}
                />
              </Box>
            </>
          ) : (
            <Stack align="center" justify="center" className={styles.empty} gap="xs">
              <Title order={2} size="h3">Your catch history starts here</Title>
              <Text c="dimmed" ta="center">Select <strong>both</strong> a <strong>case study</strong> and a <strong>fish species</strong> to display the time series.</Text>
            </Stack>
          )}
        </Paper>
        <div className={styles.actions}>
          <Button className={styles.runButton} size="md" loading={isRunning} disabled={!caseStudy || !selectedSpecies || isRunning} onClick={runScenario}>
            Run Scenario <span className={styles.buttonArrow} aria-hidden="true">→</span>
          </Button>
        </div>
      </Stack>
    </Container>
  );
};

export default CmsyInputPage;
