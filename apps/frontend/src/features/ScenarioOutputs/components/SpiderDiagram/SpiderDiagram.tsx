import {
  Chart as ChartJS,
  Filler,
  LineElement,
  PointElement,
  RadialLinearScale,
  Tooltip,
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

export type SpiderDiagramSeries = {
  label: string;
  data: SpiderDiagramDatum[];
  borderColor: string;
  backgroundColor: string;
  pointBackgroundColor: string;
};

type SpiderDiagramProps = {
  title: string;
  subtitle: string;
  datasets: SpiderDiagramSeries[];
  maxValue?: number;
  valueSuffix?: string;
  className?: string;
};

const SpiderDiagram = ({
  title,
  subtitle,
  datasets,
  maxValue = 100,
  valueSuffix = "",
  className,
}: SpiderDiagramProps) => {
  const baseDataset = datasets[0];
  const labels = baseDataset?.data.map((entry) => entry.label) ?? [];
  const tooltipLabels = baseDataset?.data.map((entry) => {
    if (entry.tooltipLabel) {
      return entry.tooltipLabel;
    }

    return Array.isArray(entry.label) ? entry.label.join(" ") : entry.label;
  }) ?? [];

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
            datasets: datasets.map((dataset) => ({
              label: dataset.label,
              data: dataset.data.map((entry) => entry.value),
              fill: true,
              borderWidth: 2,
              borderColor: dataset.borderColor,
              backgroundColor: dataset.backgroundColor,
              pointRadius: 3.6,
              pointHoverRadius: 5,
              pointBackgroundColor: dataset.pointBackgroundColor,
              pointBorderColor: "#f6fcff",
              pointBorderWidth: 1.2,
            })),
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
