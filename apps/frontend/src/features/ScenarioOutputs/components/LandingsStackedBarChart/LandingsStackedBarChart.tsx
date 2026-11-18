import usePrefersReducedMotion from "../../../../hooks/usePrefersReducedMotion";
import { readChartTheme } from "../../../../styles/chartTheme";
import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  Tooltip,
  type TooltipItem,
} from "chart.js";
import { Bar } from "react-chartjs-2";
import { SCENARIO_COMPARE_COLORS, withAlpha } from "../../scenarioCompare";
import styles from "./LandingsStackedBarChart.module.css";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

type LandingsStackedBarChartProps = {
  runLabel?: string;
  title: string;
  subtitle: string;
  labels: string[];
  landingsValues: (number | null)[];
  discardsValues: (number | null)[];
  comparison?: {
    label: string;
    landingsValues: (number | null)[];
    discardsValues: (number | null)[];
  };
  selectedIndex: number;
  onSelectIndex: (index: number) => void;
  currentLabel?: string;
  valueSuffix?: string;
  yAxisLabel?: string;
  className?: string;
  statusMessage?: string;
};

const LANDINGS_COLOR = withAlpha(
  SCENARIO_COMPARE_COLORS.scenarioOne.stroke,
  0.68,
);
const LANDINGS_ACTIVE_COLOR = SCENARIO_COMPARE_COLORS.scenarioOne.stroke;
const DISCARDS_COLOR = withAlpha(
  SCENARIO_COMPARE_COLORS.scenarioOne.stroke,
  0.32,
);
const DISCARDS_ACTIVE_COLOR = withAlpha(
  SCENARIO_COMPARE_COLORS.scenarioOne.stroke,
  0.54,
);
const COMPARISON_LANDINGS_COLOR = withAlpha(
  SCENARIO_COMPARE_COLORS.scenarioTwo.stroke,
  0.68,
);
const COMPARISON_LANDINGS_ACTIVE_COLOR =
  SCENARIO_COMPARE_COLORS.scenarioTwo.stroke;
const COMPARISON_DISCARDS_COLOR = withAlpha(
  SCENARIO_COMPARE_COLORS.scenarioTwo.stroke,
  0.32,
);
const COMPARISON_DISCARDS_ACTIVE_COLOR = withAlpha(
  SCENARIO_COMPARE_COLORS.scenarioTwo.stroke,
  0.54,
);

const LandingsStackedBarChart = ({
  title,
  runLabel = "Scenario",
  subtitle,
  labels,
  landingsValues,
  discardsValues,
  comparison,
  selectedIndex,
  onSelectIndex,
  currentLabel,
  valueSuffix = "",
  yAxisLabel = "",
  className,
  statusMessage,
}: LandingsStackedBarChartProps) => {
  const chartTheme = readChartTheme();
  const reducedMotion = usePrefersReducedMotion();
  const currentLandingsValue = landingsValues[selectedIndex] ?? null;
  const currentDiscardsValue = discardsValues[selectedIndex] ?? null;
  const currentComparisonLandingsValue =
    comparison?.landingsValues[selectedIndex] ?? null;
  const currentComparisonDiscardsValue =
    comparison?.discardsValues[selectedIndex] ?? null;

  return (
    <section className={[styles.panel, className].filter(Boolean).join(" ")}>
      <div className={styles.header}>
        <div>
          <p className={styles.kicker}>{title}</p>
          <h3 className={styles.title}>{subtitle}</h3>
        </div>

        <div className={styles.valueBlock}>
          {currentLabel ? <span>{currentLabel}</span> : null}
          <strong>
            {currentLandingsValue?.toFixed(2) ?? "—"}
            {valueSuffix}
          </strong>
          <small>
            discards {currentDiscardsValue?.toFixed(2) ?? "—"}
            {valueSuffix}
          </small>
          {comparison ? (
            <small>
              {comparison.label}: {currentComparisonLandingsValue?.toFixed(2) ?? "—"}
              {valueSuffix} · discards{" "}
              {currentComparisonDiscardsValue?.toFixed(2) ?? "—"}
              {valueSuffix}
            </small>
          ) : null}
        </div>
      </div>

      <div className={styles.chartWrap}>
        {statusMessage || ![...landingsValues, ...discardsValues, ...(comparison?.landingsValues ?? []), ...(comparison?.discardsValues ?? [])].some(value => value !== null && Number.isFinite(value)) ? <p role="status">{statusMessage ?? "No values are available for this selection."}</p> : <Bar
          data={{
            labels,
            datasets: [
              {
                label: comparison ? `${runLabel} landings` : "landings",
                data: landingsValues,
                stack: "primary",
                backgroundColor: landingsValues.map((_, index) =>
                  index === selectedIndex
                    ? LANDINGS_ACTIVE_COLOR
                    : LANDINGS_COLOR,
                ),
                borderRadius: {
                  topLeft: 0,
                  topRight: 0,
                  bottomLeft: 2,
                  bottomRight: 2,
                },
                borderSkipped: false,
                barPercentage: 0.72,
                categoryPercentage: 0.84,
              },
              {
                label: comparison ? `${runLabel} discards` : "discards",
                data: discardsValues,
                stack: "primary",
                backgroundColor: discardsValues.map((_, index) =>
                  index === selectedIndex
                    ? DISCARDS_ACTIVE_COLOR
                    : DISCARDS_COLOR,
                ),
                borderRadius: {
                  topLeft: 2,
                  topRight: 2,
                  bottomLeft: 0,
                  bottomRight: 0,
                },
                borderSkipped: false,
                barPercentage: 0.72,
                categoryPercentage: 0.84,
              },
              ...(comparison
                ? [
                    {
                      label: `${comparison.label} landings`,
                      data: comparison.landingsValues,
                      stack: "comparison",
                      backgroundColor: comparison.landingsValues.map(
                        (_, index) =>
                          index === selectedIndex
                            ? COMPARISON_LANDINGS_ACTIVE_COLOR
                            : COMPARISON_LANDINGS_COLOR,
                      ),
                      borderRadius: {
                        topLeft: 0,
                        topRight: 0,
                        bottomLeft: 2,
                        bottomRight: 2,
                      },
                      borderSkipped: false,
                      barPercentage: 0.72,
                      categoryPercentage: 0.84,
                    },
                    {
                      label: `${comparison.label} discards`,
                      data: comparison.discardsValues,
                      stack: "comparison",
                      backgroundColor: comparison.discardsValues.map(
                        (_, index) =>
                          index === selectedIndex
                            ? COMPARISON_DISCARDS_ACTIVE_COLOR
                            : COMPARISON_DISCARDS_COLOR,
                      ),
                      borderRadius: {
                        topLeft: 2,
                        topRight: 2,
                        bottomLeft: 0,
                        bottomRight: 0,
                      },
                      borderSkipped: false,
                      barPercentage: 0.72,
                      categoryPercentage: 0.84,
                    },
                  ]
                : []),
            ],
          }}
          options={{
            responsive: true,
            font: { family: chartTheme.fontFamily, size: chartTheme.fontSize },
            maintainAspectRatio: false,
            animation: {
              duration: reducedMotion ? 0 : chartTheme.duration,
            },
            interaction: {
              mode: "index",
              intersect: false,
            },
            onClick: (_event, elements) => {
              const activeElement = elements[0];
              if (activeElement) {
                onSelectIndex(activeElement.index);
              }
            },
            plugins: {
              legend: {
                position: "bottom",
                labels: {
                  color: chartTheme.muted,
                  boxWidth: 10,
                  boxHeight: 10,
                  padding: chartTheme.spacing,
                  usePointStyle: true,
                  pointStyle: "rectRounded",
                },
              },
              tooltip: {
                backgroundColor: chartTheme.surface,
                borderColor: chartTheme.grid,
                borderWidth: 1,
                callbacks: {
                  label: (context: TooltipItem<"bar">) => {
                    return `${context.dataset.label}: ${Number(context.raw).toFixed(2)}${valueSuffix}`;
                  },
                  footer: (tooltipItems) => {
                    const total = tooltipItems.reduce(
                      (sum, item) => sum + Number(item.raw),
                      0,
                    );
                    return `total: ${total.toFixed(2)}${valueSuffix}`;
                  },
                },
              },
            },
            scales: {
              x: {
                stacked: true,
                grid: {
                  display: false,
                },
                ticks: {
                  autoSkip: true,
                  color: chartTheme.muted,
                  maxRotation: 0,
                },
              },
              y: {
                stacked: true,
                beginAtZero: true,
                grid: {
                  color: chartTheme.grid,
                },
                ticks: {
                  color: chartTheme.muted,
                },
                title: yAxisLabel
                  ? {
                      display: true,
                      text: yAxisLabel,
                      color: chartTheme.muted,
                      font: {
                        size: chartTheme.fontSize,
                        weight: 600,
                      },
                    }
                  : undefined,
              },
            },
          }}
        />}
      </div>
    </section>
  );
};

export default LandingsStackedBarChart;
