import {
  type ActiveElement,
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  type LegendItem,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
  type TooltipItem,
  type ScriptableContext,
} from "chart.js";
import { Line } from "react-chartjs-2";
import styles from "./OutputsTrendChart.module.css";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Filler,
);

type OutputsTrendChartProps = {
  labels?: string[];
  values?: number[];
  historicalLabels?: string[];
  historicalValues?: number[];
  actualHistoricalValues?: number[];
  futureLabels?: string[];
  futureValues?: number[];
  metricLabel: string;
  lineColor: string;
  series?: OutputsTrendChartSeries[];
  selectedIndex: number;
  onSelectIndex: (index: number) => void;
  compact?: boolean;
};

export type OutputsTrendChartSeries = {
  label: string;
  color: string;
  boundColor?: string;
  boundOpacity?: number;
  values?: number[];
  historicalValues?: number[];
  actualHistoricalValues?: number[];
  futureValues?: number[];
};

const smoothSeries = (values: number[]) => {
  if (values.length < 3) {
    return values;
  }

  const smoothPass = (input: number[], centerWeight: number) => {
    return input.map((value, index) => {
      const previousValue = input[index - 1] ?? value;
      const nextValue = input[index + 1] ?? value;

      return (
        previousValue * ((1 - centerWeight) / 2) +
        value * centerWeight +
        nextValue * ((1 - centerWeight) / 2)
      );
    });
  };

  return smoothPass(smoothPass(values, 0.68), 0.74);
};

const smoothBand = (values: number[]) => {
  if (values.length < 3) {
    return values;
  }

  const smoothPass = (input: number[], centerWeight: number) => {
    return input.map((value, index) => {
      const previousValue = input[index - 1] ?? value;
      const nextValue = input[index + 1] ?? value;

      return (
        previousValue * ((1 - centerWeight) / 2) +
        value * centerWeight +
        nextValue * ((1 - centerWeight) / 2)
      );
    });
  };

  return smoothPass(smoothPass(smoothPass(values, 0.56), 0.62), 0.68);
};

const withAlpha = (hexColor: string, alpha: number) => {
  const normalized = hexColor.replace("#", "");
  const expanded =
    normalized.length === 3
      ? normalized
          .split("")
          .map((part) => `${part}${part}`)
          .join("")
      : normalized;

  if (expanded.length !== 6) {
    return `rgba(214, 224, 235, ${alpha})`;
  }

  const red = Number.parseInt(expanded.slice(0, 2), 16);
  const green = Number.parseInt(expanded.slice(2, 4), 16);
  const blue = Number.parseInt(expanded.slice(4, 6), 16);

  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
};

const mixWithWhite = (hexColor: string, ratio: number) => {
  const normalized = hexColor.replace("#", "");
  const expanded =
    normalized.length === 3
      ? normalized
          .split("")
          .map((part) => `${part}${part}`)
          .join("")
      : normalized;

  if (expanded.length !== 6) {
    return hexColor;
  }

  const red = Number.parseInt(expanded.slice(0, 2), 16);
  const green = Number.parseInt(expanded.slice(2, 4), 16);
  const blue = Number.parseInt(expanded.slice(4, 6), 16);

  const mixedRed = Math.round(red + (255 - red) * ratio);
  const mixedGreen = Math.round(green + (255 - green) * ratio);
  const mixedBlue = Math.round(blue + (255 - blue) * ratio);

  return `rgb(${mixedRed}, ${mixedGreen}, ${mixedBlue})`;
};

const computeBandValues = (
  rawValues: number[],
  displayValues: number[],
  valueRange: number,
) => {
  const rawBands = displayValues.map((_, index) => {
    const windowStart = Math.max(0, index - 2);
    const windowEnd = Math.min(displayValues.length - 1, index + 2);
    const windowValues = displayValues.slice(windowStart, windowEnd + 1);
    const windowResiduals = rawValues
      .slice(windowStart, windowEnd + 1)
      .map((rawValue, windowIndex) => {
        return Math.abs(rawValue - windowValues[windowIndex]);
      });
    const localSlope = windowValues.slice(1).map((windowValue, windowIndex) => {
      return Math.abs(windowValue - windowValues[windowIndex]);
    });
    const averageResidual =
      windowResiduals.reduce((sum, residual) => sum + residual, 0) /
      Math.max(windowResiduals.length, 1);
    const averageSlope =
      localSlope.reduce((sum, slope) => sum + slope, 0) /
      Math.max(localSlope.length, 1);

    return Math.max(
      valueRange * 0.06,
      averageResidual * 1.9 + averageSlope * 0.9,
    );
  });

  return smoothBand(rawBands);
};

const OutputsTrendChart = ({
  labels,
  values,
  historicalLabels,
  historicalValues,
  actualHistoricalValues,
  futureLabels,
  futureValues,
  metricLabel,
  lineColor,
  series,
  selectedIndex,
  onSelectIndex,
  compact = false,
}: OutputsTrendChartProps) => {
  const hasSplitSeries =
    historicalLabels !== undefined &&
    historicalValues !== undefined &&
    futureLabels !== undefined &&
    futureValues !== undefined;

  const resolvedLabels = hasSplitSeries
    ? [...historicalLabels, ...futureLabels]
    : (labels ?? []);

  const resolvedSeries = (
    series?.length
      ? series
      : [
          {
            label: metricLabel,
            color: lineColor,
            values,
            historicalValues,
            actualHistoricalValues,
            futureValues,
          },
        ]
  )
    .map((entry) => ({
      label: entry.label,
      color: entry.color,
      boundColor: entry.boundColor ?? entry.color,
      boundOpacity: entry.boundOpacity,
      rawValues: hasSplitSeries
        ? [...(entry.historicalValues ?? []), ...(entry.futureValues ?? [])]
        : (entry.values ?? []),
      historicalValues: entry.historicalValues ?? [],
      actualHistoricalValues:
        entry.actualHistoricalValues ?? entry.historicalValues ?? [],
    }))
    .map((entry) => ({
      ...entry,
      displayValues: smoothSeries(entry.rawValues),
    }));

  const resolvedValues = resolvedSeries.flatMap((entry) => entry.rawValues);

  const hasMultipleSeries = resolvedSeries.length > 1;

  const overallValueRange =
    resolvedValues.length > 1
      ? Math.max(...resolvedValues) - Math.min(...resolvedValues)
      : 1;

  const enrichedSeries = resolvedSeries.map((entry) => {
    const bandValues = computeBandValues(
      entry.rawValues,
      entry.displayValues,
      overallValueRange,
    );
    return {
      ...entry,
      bandValues,
    };
  });

  const futureStartIndex = hasSplitSeries ? historicalLabels.length : -1;

  const observationSeries = hasSplitSeries
    ? enrichedSeries.map((entry) => ({
        label: `Actual ${entry.label}`,
        values: [
          ...entry.actualHistoricalValues,
          ...futureLabels.map(() => null),
        ],
      }))
    : [];

  const eraSplitPlugin = {
    id: "eraSplit",
    beforeDatasetsDraw: (chart: ChartJS<"line">) => {
      if (!hasSplitSeries) {
        return;
      }

      if (futureStartIndex <= 0 || futureStartIndex >= resolvedLabels.length) {
        return;
      }

      const { ctx, chartArea, scales } = chart;
      const xScale = scales.x;
      const yScale = scales.y;

      if (!chartArea || !xScale || !yScale) {
        return;
      }

      const previousX = xScale.getPixelForValue(futureStartIndex - 1);
      const nextX = xScale.getPixelForValue(futureStartIndex);
      const dividerX = (previousX + nextX) / 2;

      ctx.save();
      const historicalGradient = ctx.createLinearGradient(
        chartArea.left,
        chartArea.top,
        dividerX,
        chartArea.top,
      );
      historicalGradient.addColorStop(0, "rgba(214, 219, 226, 0.34)");
      historicalGradient.addColorStop(0.45, "rgba(194, 201, 210, 0.24)");
      historicalGradient.addColorStop(1, "rgba(188, 196, 207, 0.12)");
      ctx.fillStyle = historicalGradient;
      ctx.fillRect(
        chartArea.left,
        chartArea.top,
        dividerX - chartArea.left,
        chartArea.bottom - chartArea.top,
      );

      ctx.fillStyle = "rgba(22, 25, 31, 0.1)";
      ctx.fillRect(
        chartArea.left,
        chartArea.top,
        dividerX - chartArea.left,
        chartArea.bottom - chartArea.top,
      );

      ctx.strokeStyle = "rgba(214, 224, 235, 0.48)";
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(dividerX, chartArea.top);
      ctx.lineTo(dividerX, chartArea.bottom);
      ctx.stroke();

      ctx.strokeStyle = "rgba(230, 236, 242, 0.22)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(chartArea.left, chartArea.top + 0.5);
      ctx.lineTo(dividerX, chartArea.top + 0.5);
      ctx.lineTo(dividerX, chartArea.bottom - 0.5);
      ctx.lineTo(chartArea.left, chartArea.bottom - 0.5);
      ctx.stroke();

      ctx.restore();
    },
  };

  const data = {
    labels: resolvedLabels,
    datasets: [
      ...enrichedSeries.flatMap((entry) => {
        const fillColor = hasMultipleSeries
          ? entry.boundColor
          : mixWithWhite(entry.boundColor, 0.5);
        const fillOpacity =
          entry.boundOpacity ?? (hasMultipleSeries ? 0.42 : 0.28);
        const lowerBoundValues = entry.displayValues.map((value, index) => {
          return value - (entry.bandValues[index] ?? overallValueRange * 0.06);
        });
        const upperBoundValues = entry.displayValues.map((value, index) => {
          return value + (entry.bandValues[index] ?? overallValueRange * 0.06);
        });

        const lineDataset = {
          label: entry.label,
          data: entry.displayValues,
          borderColor: entry.color,
          borderWidth: hasSplitSeries ? 2.4 : 2.2,
          tension: hasSplitSeries ? 0.2 : 0.4,
          pointRadius: (context: ScriptableContext<"line">) => {
            if (context.dataIndex === selectedIndex) {
              return compact
                ? hasSplitSeries
                  ? 4
                  : 4.5
                : hasSplitSeries
                  ? 5.2
                  : 5;
            }

            if (hasSplitSeries || hasMultipleSeries) {
              return 0;
            }

            return 2;
          },
          pointHoverRadius: compact ? 4.8 : 6,
          pointBackgroundColor: (context: ScriptableContext<"line">) => {
            return context.dataIndex === selectedIndex
              ? "#ffffff"
              : entry.color;
          },
          pointBorderColor: entry.color,
          pointBorderWidth:
            hasSplitSeries || hasMultipleSeries
              ? (context: ScriptableContext<"line">) => {
                  return context.dataIndex === selectedIndex ? 2.2 : 0;
                }
              : 2,
          fill: !hasSplitSeries && !hasMultipleSeries,
          spanGaps: false,
          backgroundColor: (context: ScriptableContext<"line">) => {
            if (hasSplitSeries || hasMultipleSeries) {
              return "transparent";
            }

            const chart = context.chart;
            const { ctx, chartArea } = chart;
            if (!chartArea) {
              return "rgba(111, 206, 255, 0.2)";
            }

            const gradient = ctx.createLinearGradient(
              0,
              chartArea.top,
              0,
              chartArea.bottom,
            );
            gradient.addColorStop(0, "rgba(111, 206, 255, 0.36)");
            gradient.addColorStop(1, "rgba(111, 206, 255, 0.02)");
            return gradient;
          },
          order: 2,
        };

        if (!hasSplitSeries) {
          return [lineDataset];
        }

        return [
          {
            label: `__bound__${entry.label} lower`,
            data: lowerBoundValues,
            borderColor: "transparent",
            backgroundColor: "transparent",
            pointRadius: 0,
            pointHoverRadius: 0,
            pointHitRadius: 0,
            borderWidth: 0,
            fill: false,
            spanGaps: false,
            order: -3,
          },
          {
            label: `__bound__${entry.label} upper`,
            data: upperBoundValues,
            borderColor: "transparent",
            backgroundColor: withAlpha(fillColor, fillOpacity),
            pointRadius: 0,
            pointHoverRadius: 0,
            pointHitRadius: 0,
            borderWidth: 0,
            fill: {
              target: "-1",
              above: withAlpha(fillColor, fillOpacity),
            } as const,
            spanGaps: false,
            order: -2,
          },
          lineDataset,
        ];
      }),
      ...observationSeries.map((entry) => ({
        label: entry.label,
        data: entry.values,
        borderColor: "transparent",
        backgroundColor: "#8f1f1c",
        pointBackgroundColor: "#8f1f1c",
        pointBorderColor: "rgba(255, 248, 248, 0.95)",
        pointBorderWidth: 1.4,
        pointRadius: compact ? 3.2 : hasMultipleSeries ? 3.8 : 4.4,
        pointHoverRadius: compact ? 3.6 : hasMultipleSeries ? 4.2 : 4.8,
        pointStyle: "circle" as const,
        pointHitRadius: compact ? 4 : 6,
        showLine: false,
        fill: false,
        spanGaps: false,
        order: 3,
      })),
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 620,
      easing: "easeOutQuart" as const,
    },
    interaction: {
      intersect: false,
      mode: "index" as const,
    },
    onClick: (_event: unknown, elements: ActiveElement[]) => {
      const element = elements[0];
      if (!element) {
        return;
      }

      onSelectIndex(element.index);
    },
    plugins: {
      legend: {
        display: hasMultipleSeries,
        labels: {
          color: "rgba(216, 236, 249, 0.8)",
          boxWidth: 10,
          boxHeight: 10,
          usePointStyle: true,
          pointStyle: "line",
          padding: 16,
          filter: (legendItem: LegendItem) => {
            return !legendItem.text.startsWith("__bound__");
          },
        },
      },
      tooltip: {
        backgroundColor: "rgba(3, 20, 38, 0.92)",
        borderColor: "rgba(141, 219, 255, 0.5)",
        borderWidth: 1,
        padding: 10,
        displayColors: hasMultipleSeries,
        filter: (tooltipItem: TooltipItem<"line">) => {
          return !tooltipItem.dataset.label?.startsWith("__bound__");
        },
      },
    },
    scales: {
      x: {
        ticks: {
          color: "rgba(205, 233, 251, 0.7)",
          autoSkip: true,
          maxRotation: 0,
          maxTicksLimit: hasSplitSeries ? 8 : 10,
          font: {
            size: compact ? 10 : 12,
          },
        },
        grid: {
          color: "rgba(144, 202, 238, 0.14)",
        },
      },
      y: {
        ticks: {
          color: "rgba(205, 233, 251, 0.7)",
          font: {
            size: compact ? 10 : 12,
          },
        },
        grid: {
          color: "rgba(144, 202, 238, 0.12)",
        },
      },
    },
  };

  (
    chartOptions.plugins as typeof chartOptions.plugins & {
      dragData?: boolean;
    }
  ).dragData = false;

  return (
    <div
      className={[styles.chartWrap, compact ? styles.chartWrapCompact : ""]
        .filter(Boolean)
        .join(" ")}
    >
      <Line
        data={data}
        plugins={hasSplitSeries ? [eraSplitPlugin] : []}
        options={chartOptions}
      />
    </div>
  );
};

export default OutputsTrendChart;
