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
  id: string;
  label: string | readonly string[];
  tooltipLabel?: string;
  value: number;
};

type SpiderDiagramComparison = {
  label: string;
  data: SpiderDiagramDatum[];
};

type SpiderDiagramProps = {
  title: string;
  subtitle: string;
  dataLabel?: string;
  data: SpiderDiagramDatum[];
  comparison?: SpiderDiagramComparison;
  maxValue?: number;
  valueSuffix?: string;
  className?: string;
};

const SpiderDiagram = ({
  title,
  subtitle,
  dataLabel = "Scenario",
  data,
  comparison,
  maxValue = 100,
  valueSuffix = "",
  className,
}: SpiderDiagramProps) => {
  const labels = data.map((entry) => entry.label);
  const values = data.map((entry) => entry.value);
  const comparisonValues = comparison?.data.map((entry) => entry.value) ?? [];
  const tooltipLabels = data.map((entry) => {
    if (entry.tooltipLabel) {
      return entry.tooltipLabel;
    }

    return Array.isArray(entry.label) ? entry.label.join(" ") : entry.label;
  });

  return (
    <section className={[styles.panel, className].filter(Boolean).join(" ")}>
      <div className={styles.header}>
        <div>
          <p className={styles.kicker}>{title}</p>
          <h3 className={styles.title}>{subtitle}</h3>
        </div>
      </div>

      <div className={styles.chartWrap}>
        <Radar
          data={{
            labels,
            datasets: [
              {
                label: dataLabel,
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
              ...(comparison
                ? [
                    {
                      label: comparison.label,
                      data: comparisonValues,
                      fill: true,
                      borderWidth: 2,
                      borderColor: "#83f2c8",
                      backgroundColor: "rgba(131, 242, 200, 0.12)",
                      pointRadius: 3.4,
                      pointHoverRadius: 4.8,
                      pointBackgroundColor: "#83f2c8",
                      pointBorderColor: "#f6fcff",
                      pointBorderWidth: 1.1,
                    },
                  ]
                : []),
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
                display: true,
                position: "left",
                align: "center",
                labels: {
                  color: "rgba(224, 243, 255, 0.84)",
                  boxWidth: 12,
                  boxHeight: 12,
                  padding: 16,
                  usePointStyle: true,
                  pointStyle: "rectRounded",
                },
              },
              tooltip: {
                backgroundColor: "rgba(4, 18, 33, 0.94)",
                borderColor: "rgba(121, 214, 255, 0.3)",
                borderWidth: 1,
                callbacks: {
                  title: (items) => {
                    const item = items[0];
                    return String(tooltipLabels[item?.dataIndex ?? 0] ?? "");
                  },
                  label: (context: TooltipItem<"radar">) => {
                    return `${context.dataset.label}: ${Number(context.raw).toFixed(0)}${valueSuffix}`;
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
    </section>
  );
};

export default SpiderDiagram;
