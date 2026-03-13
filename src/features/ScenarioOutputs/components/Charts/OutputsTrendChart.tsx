import {
  type ActiveElement,
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
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
  labels: string[];
  values: number[];
  metricLabel: string;
  lineColor: string;
  selectedIndex: number;
  onSelectIndex: (index: number) => void;
};

const OutputsTrendChart = ({
  labels,
  values,
  metricLabel,
  lineColor,
  selectedIndex,
  onSelectIndex,
}: OutputsTrendChartProps) => {
  const data = {
    labels,
    datasets: [
      {
        label: metricLabel,
        data: values,
        borderColor: lineColor,
        borderWidth: 2.2,
        tension: 0.34,
        pointRadius: (context: ScriptableContext<"line">) => {
          return context.dataIndex === selectedIndex ? 5 : 2;
        },
        pointHoverRadius: 6,
        pointBackgroundColor: (context: ScriptableContext<"line">) => {
          return context.dataIndex === selectedIndex ? "#ffffff" : lineColor;
        },
        pointBorderColor: lineColor,
        pointBorderWidth: 2,
        fill: true,
        backgroundColor: (context: ScriptableContext<"line">) => {
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
      },
    ],
  };

  return (
    <div className={styles.chartWrap}>
      <Line
        data={data}
        options={{
          responsive: true,
          maintainAspectRatio: false,
          animation: {
            duration: 620,
            easing: "easeOutQuart",
          },
          interaction: {
            intersect: false,
            mode: "index",
          },
          onClick: (_event, elements: ActiveElement[]) => {
            const element = elements[0];
            if (!element) {
              return;
            }

            onSelectIndex(element.index);
          },
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: "rgba(3, 20, 38, 0.92)",
              borderColor: "rgba(141, 219, 255, 0.5)",
              borderWidth: 1,
              padding: 10,
              displayColors: false,
            },
          },
          scales: {
            x: {
              ticks: {
                color: "rgba(205, 233, 251, 0.7)",
                maxRotation: 0,
              },
              grid: {
                color: "rgba(144, 202, 238, 0.14)",
              },
            },
            y: {
              ticks: {
                color: "rgba(205, 233, 251, 0.7)",
              },
              grid: {
                color: "rgba(144, 202, 238, 0.12)",
              },
            },
          },
        }}
      />
    </div>
  );
};

export default OutputsTrendChart;
