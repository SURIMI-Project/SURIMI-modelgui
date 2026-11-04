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
import {
  SCENARIO_COMPARE_COLORS,
  withAlpha,
} from "../../scenarioCompare";
import styles from "./LandingsStackedBarChart.module.css";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

type LandingsStackedBarChartProps = {
  title: string;
  subtitle: string;
  labels: string[];
  landingsValues: number[];
  discardsValues: number[];
  comparison?: {
    label: string;
    landingsValues: number[];
    discardsValues: number[];
  };
  selectedIndex: number;
  onSelectIndex: (index: number) => void;
  currentLabel?: string;
  valueSuffix?: string;
  yAxisLabel?: string;
  className?: string;
};

const LANDINGS_COLOR = withAlpha(SCENARIO_COMPARE_COLORS.scenarioOne.stroke, 0.68);
const LANDINGS_ACTIVE_COLOR = SCENARIO_COMPARE_COLORS.scenarioOne.stroke;
const DISCARDS_COLOR = withAlpha(SCENARIO_COMPARE_COLORS.scenarioOne.stroke, 0.32);
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
}: LandingsStackedBarChartProps) => {
  const currentLandingsValue = landingsValues[selectedIndex] ?? 0;
  const currentDiscardsValue = discardsValues[selectedIndex] ?? 0;
  const currentComparisonLandingsValue =
    comparison?.landingsValues[selectedIndex] ?? 0;
  const currentComparisonDiscardsValue =
    comparison?.discardsValues[selectedIndex] ?? 0;

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
            {currentLandingsValue.toFixed(2)}
            {valueSuffix}
          </strong>
          <small>
            discards {currentDiscardsValue.toFixed(2)}
            {valueSuffix}
          </small>
          {comparison ? (
            <small>
              {comparison.label}: {currentComparisonLandingsValue.toFixed(2)}
              {valueSuffix} · discards {currentComparisonDiscardsValue.toFixed(2)}
              {valueSuffix}
            </small>
          ) : null}
        </div>
      </div>

      <div className={styles.chartWrap}>
        <Bar
          data={{
            labels,
            datasets: [
              {
                label: comparison ? "Scenario 1 landings" : "landings",
                data: landingsValues,
                stack: "primary",
                backgroundColor: landingsValues.map((_, index) =>
                  index === selectedIndex ? LANDINGS_ACTIVE_COLOR : LANDINGS_COLOR,
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
                label: comparison ? "Scenario 1 discards" : "discards",
                data: discardsValues,
                stack: "primary",
                backgroundColor: discardsValues.map((_, index) =>
                  index === selectedIndex ? DISCARDS_ACTIVE_COLOR : DISCARDS_COLOR,
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
                      backgroundColor: comparison.landingsValues.map((_, index) =>
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
                      backgroundColor: comparison.discardsValues.map((_, index) =>
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
            maintainAspectRatio: false,
            animation: {
              duration: 420,
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
                  color: "rgba(224, 243, 255, 0.84)",
                  boxWidth: 10,
                  boxHeight: 10,
                  padding: 18,
                  usePointStyle: true,
                  pointStyle: "rectRounded",
                },
              },
              tooltip: {
                backgroundColor: "rgba(4, 18, 33, 0.94)",
                borderColor: "rgba(121, 214, 255, 0.3)",
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
                  color: "rgba(214, 236, 249, 0.78)",
                  maxRotation: 0,
                },
              },
              y: {
                stacked: true,
                beginAtZero: true,
                grid: {
                  color: "rgba(143, 214, 248, 0.12)",
                },
                ticks: {
                  color: "rgba(214, 236, 249, 0.78)",
                },
                title: yAxisLabel
                  ? {
                      display: true,
                      text: yAxisLabel,
                      color: "rgba(214, 236, 249, 0.78)",
                      font: {
                        size: 12,
                        weight: 600,
                      },
                    }
                  : undefined,
              },
            },
          }}
        />
      </div>
    </section>
  );
};

export default LandingsStackedBarChart;
