import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { CategoryScale, Chart as ChartJS, Filler, Legend, LineElement, LinearScale, PointElement, Tooltip } from "chart.js";
import { Line } from "react-chartjs-2";
import Card from "../../../components/ui/Card/Card";
import Button from "../../../components/ui/Button/Button";
import Select from "../../../components/ui/Select/Select";
import RadioGroup, { Radio } from "../../../components/ui/RadioGroup/RadioGroup";
import CmsyLayout from "../../../features/cmsy/CmsyLayout";
import { cmsyCases, cmsySpecies } from "../../../features/cmsy/selection";
import { readChartTheme, withAlpha } from "../../../styles/chartTheme";
import catchCsv from "../../../../mock-data/cmsy-catches.csv?raw";
import styles from "../../../features/cmsy/Cmsy.module.css";

ChartJS.register(CategoryScale, LinearScale, LineElement, PointElement, Tooltip, Filler, Legend);
const catches = catchCsv.trim().split(/\r?\n/).slice(1).map(line => {
  const [stock, year, value] = line.split(",");
  return { stock, year: Number(year), catchTonnes: value && value !== "NA" && Number.isFinite(Number(value)) ? Number(value) : null };
}).filter(point => Number.isFinite(point.year));

export default function CmsyInputPage() {
  const navigate = useNavigate();
  const [caseId, setCaseId] = useState("");
  const [stockCode, setStockCode] = useState("");
  const selectedCase = cmsyCases.find(study => study.id === caseId);
  const selectedSpecies = cmsySpecies.find(fish => fish.value === stockCode);
  const series = catches.filter(point => point.stock === stockCode).sort((a, b) => a.year - b.year);
  const theme = readChartTheme();
  return <CmsyLayout title="Explore catch history" description="Choose a case study and species to view the sample annual catch series.">
    <div className={styles.content}>
      <Card><div className={styles.inputs}>
        <RadioGroup label="Case study" value={caseId} onChange={setCaseId} className={styles.cases}>
          {cmsyCases.map(study => <Radio key={study.id} value={study.id} className={styles.caseOption}>
            <img src={study.image} alt="" /><span>{study.name}</span>
          </Radio>)}
        </RadioGroup>
        <Select label="Fish species" placeholder="Select a fish species" options={cmsySpecies} selectedKey={stockCode || null} onSelectionChange={key => setStockCode(String(key ?? ""))} />
      </div></Card>
      <Card>
        {selectedCase && selectedSpecies ? <>
          <header className={styles.chartHeader}><h2>{selectedSpecies.label} — annual catch</h2>
            <p>{selectedSpecies.scientificName} · {selectedCase.name} · {series[0]?.year}–{series.at(-1)?.year}</p>
            <p>Sample catch data shared across case studies.</p>
          </header>
          <div className={styles.chart}><Line role="img" aria-label={`Sample annual catch for ${selectedSpecies.label}`}
            data={{ labels: series.map(point => String(point.year)), datasets: [{ label: "Catch (tonnes)", data: series.map(point => point.catchTonnes), borderColor: theme.primary, backgroundColor: withAlpha(theme.primary ?? "", 0.12), fill: true, tension: 0.25, pointRadius: 2, pointHoverRadius: 6, spanGaps: false }] }}
            options={{ responsive: true, maintainAspectRatio: false, animation: false, color: theme.muted,
              font: { family: theme.fontFamily, size: theme.fontSize }, interaction: { mode: "index", intersect: false },
              plugins: { legend: { labels: { color: theme.muted } }, tooltip: { backgroundColor: theme.surface, titleColor: theme.text, bodyColor: theme.text,
                callbacks: { title: items => `Year ${items[0]?.label}`, label: context => `Catch: ${context.parsed.y?.toLocaleString()} tonnes` } } },
              scales: { x: { title: { display: true, text: "Year", color: theme.muted }, grid: { color: theme.grid }, ticks: { color: theme.muted, maxTicksLimit: 10 } },
                y: { beginAtZero: true, title: { display: true, text: "Catch (tonnes/year)", color: theme.muted }, grid: { color: theme.grid }, ticks: { color: theme.muted } } } }} />
          </div>
        </> : <div className={styles.empty}><h2>Your catch history starts here</h2><p>Select a case study and a fish species.</p></div>}
      </Card>
      <div className={styles.actions}><Button isDisabled={!selectedCase || !selectedSpecies} onPress={() => {
        if (selectedCase && selectedSpecies) navigate(`/cmsy-output?${new URLSearchParams({ caseStudy: selectedCase.id, fish: selectedSpecies.value })}`);
      }}>VIEW DEMO OUTPUT</Button></div>
    </div>
  </CmsyLayout>;
}
