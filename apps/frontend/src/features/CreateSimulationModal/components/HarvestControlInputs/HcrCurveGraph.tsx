import {
  type ActiveElement,
  Chart as ChartJS,
  type ChartEvent,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
  type ChartOptions,
} from "chart.js";
import dragDataPlugin from "chartjs-plugin-dragdata";
import { Line } from "react-chartjs-2";
const CHART_POINT_LABELS = ["Origin", "Biomass limit", "Biomass base", "Maximum fishing mortality"];
import type { GraphPoint, HcrCurveRow } from "./types";

ChartJS.register(
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
  Legend,
  dragDataPlugin,
);

type HcrCurveGraphProps = {
  activeRow: HcrCurveRow;
  graphPoints: GraphPoint[];
  xMax: number;
  isDraggingHandle: boolean;
  isReadOnly?: boolean;
  onDragStart: (pointIndex: number) => boolean;
  onDrag: (pointIndex: number, point: GraphPoint) => GraphPoint | null;
  onDragEnd: (pointIndex: number) => void;
};

const formatDisplayValue = (value: number) => value.toLocaleString("en", { maximumSignificantDigits: 8 });

const HcrCurveGraph = ({
  activeRow,
  graphPoints,
  xMax,
  isDraggingHandle,
  isReadOnly = false,
  onDragStart,
  onDrag,
  onDragEnd,
}: HcrCurveGraphProps) => {
  const theme = getComputedStyle(document.documentElement);
  const token = (name: string) => theme.getPropertyValue(name).trim();
  const text = token("--color-map-detail-text");
  const border = token("--color-map-card-border");
  const primary = token("--color-primary");
  const surface = token("--color-setup-panel");
  const chartOptions: ChartOptions<"line"> = {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    interaction: {
      mode: "nearest",
      intersect: true,
    },
    onHover: (_event: ChartEvent, activeElements: ActiveElement[], chart) => {
      const isHandleHovered = activeElements.some(
        (element) => element.index === 1 || element.index === 2,
      );

      chart.canvas.style.cursor = isReadOnly ? "default" : isDraggingHandle
        ? "grabbing"
        : isHandleHovered
          ? "grab"
          : "default";
    },
    scales: {
      x: {
        type: "linear",
        min: 0,
        max: xMax,
        ticks: {
          color: text,
          callback: (value) => formatDisplayValue(Number(value)),
        },
        grid: {
          color: border,
        },
        title: {
          display: true,
          text: "Biomass (kg)",
          color: text,
          font: { size: 14, weight: 600 },
        },
      },
      y: {
        min: 0,
        max: Math.min(100, Math.max(1, activeRow.fMax * 1.25)),
        ticks: {
          color: text,
          callback: (value) => formatDisplayValue(Number(value)),
        },
        grid: {
          color: border,
        },
        title: {
          display: true,
          text: "Fishing mortality (catch/biomass)",
          color: text,
          font: { size: 14, weight: 600 },
        },
      },
    },
    plugins: {
      legend: {
        labels: {
          color: text,
        },
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const point = context.raw as GraphPoint;
            const pointLabel = CHART_POINT_LABELS[context.dataIndex] ?? "Control";

            return `${pointLabel}: x=${formatDisplayValue(point.x)}, y=${formatDisplayValue(point.y)}`;
          },
        },
      },
    },
  };

  (
    chartOptions.plugins as NonNullable<ChartOptions<"line">["plugins"]> & {
      dragData?: Record<string, unknown>;
    }
  ).dragData = {
    dragX: !isReadOnly,
    dragY: !isReadOnly,
    showTooltip: true,
    round: 4,
    onDragStart: (
      _event: unknown,
      _datasetIndex: number,
      pointIndex: number,
    ) => {
      return onDragStart(pointIndex);
    },
    onDrag: (
      _event: unknown,
      _datasetIndex: number,
      pointIndex: number,
      value: unknown,
    ) => {
      const nextPoint = onDrag(pointIndex, value as GraphPoint);

      if (!nextPoint) {
        return false;
      }

      const point = value as GraphPoint;
      point.x = nextPoint.x;
      point.y = nextPoint.y;
      return true;
    },
    onDragEnd: (_event: unknown, _datasetIndex: number, pointIndex: number) => {
      onDragEnd(pointIndex);
    },
  };

  const chartData = {
    datasets: [
      {
        label: activeRow.label,
        data: graphPoints,
        parsing: false as const,
        borderColor: primary,
        backgroundColor: primary,
        borderWidth: 3,
        clip: false as const,
        pointRadius: [0, 8, 8, 0],
        pointHoverRadius: [0, 9, 9, 0],
        pointHitRadius: [0, 20, 20, 0],
        pointBackgroundColor: [
          "transparent",
          primary,
          surface,
          "transparent",
        ],
        pointBorderColor: primary,
        pointBorderWidth: [0, 3, 3, 0],
        tension: 0,
        segment: {
          borderColor: () => primary,
        },
      },
    ],
  };

  return <Line options={chartOptions} data={chartData} role="img" aria-label={`${activeRow.label}: biomass limit ${activeRow.biomassLimit} kg, biomass base ${activeRow.biomassBase} kg, maximum fishing mortality ${activeRow.fMax} per year`} />;
};

export default HcrCurveGraph;
