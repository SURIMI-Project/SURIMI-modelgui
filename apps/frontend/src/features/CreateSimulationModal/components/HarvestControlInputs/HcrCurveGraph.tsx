import { useMemo, useRef } from "react";
import { createTacHoverPlugin } from "./tacHoverPlugin";
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
  yMax: number;
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
  yMax,
  isDraggingHandle,
  isReadOnly = false,
  onDragStart,
  onDrag,
  onDragEnd,
}: HcrCurveGraphProps) => {
  const chartRef = useRef<ChartJS<"line", GraphPoint[]> | null>(null);
  const curve = (limit: number, base: number, mortality: number) => [
    { x: 0, y: 0 }, { x: limit / 1000, y: 0 },
    { x: Math.max(limit, base) / 1000, y: mortality }, { x: xMax / 1000, y: mortality },
  ];
  const theme = getComputedStyle(document.documentElement);
  const token = (name: string) => theme.getPropertyValue(name).trim();
  const text = token("--color-map-detail-text");
  const border = token("--color-map-card-border");
  const primary = token("--color-primary");
  const surface = token("--color-setup-panel");
  const tooltipSurface = token("--color-surface");
  const font = token("--font-sans");
  const tacHoverPlugin = useMemo(() => createTacHoverPlugin({ text, surface: tooltipSurface, border, primary, font }), [text, tooltipSurface, border, primary, font]);
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
        (element) => element.datasetIndex === 1,
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
        max: xMax / 1000,
        ticks: {
          color: text,
          callback: (value) => formatDisplayValue(Number(value)),
        },
        grid: {
          color: border,
        },
        title: {
          display: true,
          text: "Biomass (tonnes)",
          color: text,
          font: { size: 12, weight: 400 },
        },
      },
      y: {
        min: 0,
        max: yMax,
        ticks: {
          color: text,
          callback: (value) => formatDisplayValue(Number(value)),
        },
        grid: {
          color: border,
        },
        title: {
          display: true,
          text: "Fishing mortality (per year)",
          color: text,
          font: { size: 12, weight: 400 },
        },
      },
    },
    plugins: {
      legend: {
        labels: {
          filter: item => item.datasetIndex === 0,
          color: text,
        },
      },
      tooltip: { enabled: false },
    },
  };

  (
    chartOptions.plugins as NonNullable<ChartOptions<"line">["plugins"]> & {
      dragData?: Record<string, unknown>;
    }
  ).dragData = {
    dragX: !isReadOnly,
    dragY: !isReadOnly,
    showTooltip: false,
    round: 4,
    onDragStart: (
      _event: unknown,
      datasetIndex: number,
      pointIndex: number,
    ) => {
      const allowed = datasetIndex === 1 && onDragStart(pointIndex + 1);
      tacHoverPlugin.setDragging(allowed);
      return allowed;
    },
    onDrag: (
      _event: unknown,
      datasetIndex: number,
      pointIndex: number,
      value: unknown,
    ) => {
      const dragged = value as GraphPoint;
      if (datasetIndex !== 1) return false;
      const nextPoint = onDrag(pointIndex + 1, { x: dragged.x * 1000, y: dragged.y });

      if (!nextPoint) {
        return false;
      }

      const point = value as GraphPoint;
      point.x = nextPoint.x / 1000;
      point.y = nextPoint.y;
      const chart = chartRef.current;
      if (chart) chart.data.datasets[0].data = curve(
        pointIndex === 0 ? nextPoint.x : activeRow.biomassLimit,
        pointIndex === 1 ? nextPoint.x : activeRow.biomassBase,
        pointIndex === 1 ? nextPoint.y : activeRow.fMax,
      );
      return true;
    },
    onDragEnd: (_event: unknown, datasetIndex: number, pointIndex: number) => {
      tacHoverPlugin.setDragging(false);
      if (datasetIndex === 1) onDragEnd(pointIndex + 1);
    },
  };

  const chartData = {
    datasets: [
      {
        label: activeRow.label,
        data: curve(activeRow.biomassLimit, activeRow.biomassBase, activeRow.fMax),
        parsing: false as const,
        borderColor: primary,
        backgroundColor: primary,
        borderWidth: 3,
        clip: false as const,
        pointRadius: 0,
        pointHitRadius: 0,
        tension: 0,
        segment: {
          borderColor: () => primary,
        },
      },
      {
        label: "Control points",
        data: graphPoints.slice(1, 3).map(point => ({ x: point.x / 1000, y: point.y })),
        parsing: false as const, showLine: false, pointRadius: 8, pointHoverRadius: 9,
        pointHitRadius: 26, pointBackgroundColor: [primary, surface],
        pointBorderColor: primary, pointBorderWidth: 3, clip: false as const,
      },
    ],
  };

  return <Line ref={chartRef} plugins={[tacHoverPlugin]} options={chartOptions} data={chartData} role="img" aria-label={`${activeRow.label}: biomass limit ${activeRow.biomassLimit / 1000} tonnes, biomass base ${activeRow.biomassBase / 1000} tonnes, fishing mortality ${activeRow.fMax} per year. Annual TAC at the biomass base: ${activeRow.biomassBase <= activeRow.biomassLimit ? 0 : activeRow.biomassBase / 1000 * activeRow.fMax} tonnes per year`} />;
};

export default HcrCurveGraph;
