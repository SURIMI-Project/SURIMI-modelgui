import {
  Chart as ChartJS,
  Filler,
  LineElement,
  PointElement,
  RadialLinearScale,
  Tooltip,
  type ScriptableContext,
  type TooltipItem,
} from "chart.js";
import { Radar } from "react-chartjs-2";
import styles from "./SpiderDiagram.module.css";

ChartJS.register(
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
);

export type SpiderDiagramDatum = {
  label: string;
  value: number;
};

type SpiderDiagramProps = {
  title: string;
  subtitle: string;
  currentLabel?: string;
  data: SpiderDiagramDatum[];
  maxValue?: number;
  valueSuffix?: string;
  className?: string;
};

const SpiderDiagram = ({
  title,
  subtitle,
  currentLabel,
  data,
  maxValue = 100,
  valueSuffix = "",
  className,
}: SpiderDiagramProps) => {
  const labels = data.map((entry) => entry.label);
  const values = data.map((entry) => entry.value);

  return (
    <section className={[styles.panel, className].filter(Boolean).join(" ")}>
      <div className={styles.header}>
        <div>
          <p className={styles.kicker}>{title}</p>
          <h3 className={styles.title}>{subtitle}</h3>
        </div>

        {currentLabel ? <span className={styles.currentLabel}>{currentLabel}</span> : null}
      </div>

      <div className={styles.chartWrap}>
        <Radar
          data={{
            labels,
            datasets: [
              {
                label: title,
                data: values,
                fill: true,
                borderWidth: 2,
                borderColor: "#78deff",
                backgroundColor: (context: ScriptableContext<"radar">) => {
                  const chart = context.chart;
                  const gradient = chart.ctx.createLinearGradient(0, 0, 0, chart.height);
                  gradient.addColorStop(0, "rgba(120, 222, 255, 0.34)");
                  gradient.addColorStop(1, "rgba(255, 176, 107, 0.08)");
                  return gradient;
                },
                pointRadius: 3.6,
                pointHoverRadius: 5,
                pointBackgroundColor: "#ffb36b",
                pointBorderColor: "#f6fcff",
                pointBorderWidth: 1.2,
              },
            ],
          }}
          options={{
            responsive: true,
            maintainAspectRatio: false,
            animation: {
              duration: 520,
            },
            plugins: {
              legend: {
                display: false,
              },
              tooltip: {
                backgroundColor: "rgba(4, 18, 33, 0.94)",
                borderColor: "rgba(121, 214, 255, 0.3)",
                borderWidth: 1,
                displayColors: false,
                callbacks: {
                  label: (context: TooltipItem<"radar">) => {
                    return `${context.label}: ${Number(context.raw).toFixed(0)}${valueSuffix}`;
                  },
                },
              },
            },
            scales: {
              r: {
                min: 0,
                max: maxValue,
                beginAtZero: true,
                ticks: {
                  display: false,
                  stepSize: maxValue / 5,
                },
                angleLines: {
                  color: "rgba(143, 214, 248, 0.16)",
                },
                grid: {
                  color: "rgba(143, 214, 248, 0.18)",
                },
                pointLabels: {
                  color: "rgba(228, 244, 255, 0.88)",
                  font: {
                    size: 12,
                    weight: 600,
                  },
                },
              },
            },
          }}
        />
      </div>

      <div className={styles.metricGrid}>
        {data.map((entry) => (
          <div key={entry.label} className={styles.metricCard}>
            <span>{entry.label}</span>
            <strong>
              {entry.value.toFixed(0)}
              {valueSuffix}
            </strong>
          </div>
        ))}
      </div>
    </section>
  );
};

export default SpiderDiagram;
