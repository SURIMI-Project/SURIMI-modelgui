import {
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
} from "chart.js";
import { Line } from "react-chartjs-2";
import type { StockMockData } from "../../data/mockData";
import InsightChartCard from "../InsightChartCard/InsightChartCard";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Filler,
);

type StockSizeChartProps = {
  stock: StockMockData;
};

const normalizeBiomassValue = (rawBiomass: number, bmsy: number) => {
  let normalized = rawBiomass;

  // Some source values appear one order of magnitude too high.
  while (normalized / bmsy > 2) {
    normalized /= 10;
  }

  return normalized;
};

const StockSizeChart = ({ stock }: StockSizeChartProps) => {
  const { stockSize } = stock;

  const observedYears = stockSize.series
    .filter(
      (point) =>
        point.biomass !== null &&
        point.biomass !== stockSize.unavailableRawValue,
    )
    .map((point) => point.year);

  const lastObservedYear =
    observedYears.length > 0 ? Math.max(...observedYears) : 2012;

  const points = stockSize.series
    .filter((point) => point.year >= 1985 && point.year <= lastObservedYear)
    .map((point) => {
      const isUnavailable =
        point.biomass === null || point.biomass === stockSize.unavailableRawValue;

      let ratio = stockSize.defaultRatio;

      if (!isUnavailable && point.biomass !== null) {
        ratio = normalizeBiomassValue(point.biomass, stockSize.bmsy) / stockSize.bmsy;
      }

      return {
        year: point.year,
        ratio,
      };
    });

  const labels = points.map((point) => point.year.toString());
  const ratioSeries = points.map((point) => point.ratio);
  const center = (points.length - 1) / 2;

  const spreadSeries = points.map((_, index) => {
    const edgeDistance = Math.abs(index - center) / center;
    return 0.055 + 0.05 * edgeDistance;
  });

  const lowerBand = ratioSeries.map((value, i) => Math.max(0, value - spreadSeries[i]));
  const upperBand = ratioSeries.map((value, i) => Math.min(2, value + spreadSeries[i]));

  const data = {
    labels,
    datasets: [
      {
        label: "Band upper",
        data: upperBand,
        borderColor: "rgba(0,0,0,0)",
        pointRadius: 0,
        tension: 0.2,
      },
      {
        label: "Band lower",
        data: lowerBand,
        borderColor: "rgba(0,0,0,0)",
        pointRadius: 0,
        tension: 0.2,
        fill: {
          target: 0,
          above: "rgba(97, 115, 176, 0.16)",
          below: "rgba(97, 115, 176, 0.16)",
        },
      },
      {
        label: "B/BMSY",
        data: ratioSeries,
        borderColor: "#6173b0",
        borderWidth: 2.5,
        pointRadius: 0,
        pointHoverRadius: 4,
        pointHoverBackgroundColor: "#6173b0",
        pointHoverBorderColor: "#ffffff",
        pointHoverBorderWidth: 2,
        tension: 0.15,
      },
      {
        label: "BMSY threshold",
        data: ratioSeries.map(() => 1),
        borderColor: "#c40f14",
        borderDash: [6, 4],
        borderWidth: 1,
        pointRadius: 0,
        tension: 0,
      },
      {
        label: "Half threshold",
        data: ratioSeries.map(() => 0.5),
        borderColor: "#f56b0a",
        borderDash: [2, 4],
        borderWidth: 1,
        pointRadius: 0,
        tension: 0,
      },
    ],
  };

  return (
    <InsightChartCard
      title="Stock Size (B/BMSY)"
      subtitle="State of biomass relative to sustainable target"
      hints={[
        "Blue line is B/BMSY through time.",
        "Red dashed line at 1 means biomass is at target.",
        "Orange dashed line at 0.5 marks depleted zone.",
        "Hover points to read stock state for that year.",
      ]}
    >
      <Line
        data={data}
        options={{
          responsive: true,
          maintainAspectRatio: false,
          animation: false,
          plugins: {
            legend: {
              display: false,
            },
            tooltip: {
              mode: "index",
              intersect: false,
              filter: (ctx) =>
                ctx.dataset.label !== "Band lower" && ctx.dataset.label !== "Band upper",
              callbacks: {
                title: (items: any) => `Year ${items[0]?.label}`,
                label: (ctx: any) => {
                  if (ctx.dataset.label === "B/BMSY") {
                    return `B/BMSY: ${ctx.parsed.y.toFixed(2)}`;
                  }
                  if (ctx.dataset.label === "BMSY threshold") {
                    return "Target threshold: 1.00";
                  }
                  if (ctx.dataset.label === "Half threshold") {
                    return "Depletion warning: 0.50";
                  }
                  return "";
                },
                afterBody: (items: any) => {
                  const point = items.find((item: any) => item.dataset.label === "B/BMSY");
                  if (!point) {
                    return "";
                  }
                  const value = point.parsed.y as number;
                  if (value >= 1) {
                    return "Healthy biomass level.";
                  }
                  if (value >= 0.5) {
                    return "Below target, but not collapsed.";
                  }
                  return "Low biomass recovery zone.";
                },
              },
            },
          },
          interaction: {
            mode: "nearest",
            axis: "x",
            intersect: false,
          },
          scales: {
            x: {
              grid: {
                color: "rgba(97,115,176,0.09)",
              },
              ticks: {
                autoSkip: true,
                maxTicksLimit: 7,
              },
            },
            y: {
              min: 0,
              max: 2.1,
              ticks: {
                stepSize: 0.5,
              },
              title: {
                display: true,
                text: "B / BMSY",
              },
              grid: {
                color: "rgba(97,115,176,0.09)",
              },
            },
          },
        }}
      />
    </InsightChartCard>
  );
};

export default StockSizeChart;
