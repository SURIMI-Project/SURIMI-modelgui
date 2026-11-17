import { readChartTheme, withAlpha } from "../../../styles/chartTheme";
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
import type { StockMockData } from "../../../../mock-data/cmsy";
import InsightChartCard from "./InsightChartCard";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Filler,
);

type CatchMsyChartProps = {
  stock: StockMockData;
};

const CatchMsyChart = ({ stock }: CatchMsyChartProps) => {
  const theme = readChartTheme();
  const observed = stock.catches.filter(
    (
      point,
    ): point is (typeof stock.catches)[number] & { catchKtonnes: number } =>
      point.catchKtonnes !== null,
  );

  const labels = observed.map((point) => point.year.toString());
  const catchSeries = observed.map((point) => point.catchKtonnes);
  const msySeries = observed.map(() => stock.msyBsm);
  const lclSeries = observed.map(() => stock.lclMsyBsm);
  const uclSeries = observed.map(() => stock.uclMsyBsm);

  const maxCatch = Math.max(...catchSeries, stock.uclMsyBsm);

  const data = {
    labels,
    datasets: [
      {
        label: "Band upper",
        data: uclSeries,
        borderColor: "transparent",
        pointRadius: 0,
        tension: 0,
      },
      {
        label: "Band lower",
        data: lclSeries,
        borderColor: "transparent",
        pointRadius: 0,
        tension: 0,
        fill: {
          target: 0,
          above: withAlpha(theme.series ?? "", 0.16),
          below: withAlpha(theme.series ?? "", 0.16),
        },
      },
      {
        label: "MSY",
        data: msySeries,
        borderColor: theme.series,
        borderDash: [7, 5],
        borderWidth: 2,
        pointRadius: 0,
        tension: 0,
      },
      {
        label: "Catch",
        data: catchSeries,
        borderColor: theme.primary,
        backgroundColor: withAlpha(theme.primary ?? "", 0.1),
        borderWidth: 2.5,
        pointRadius: 0,
        pointHoverRadius: 4,
        pointHoverBackgroundColor: theme.primary,
        pointHoverBorderColor: theme.text,
        pointHoverBorderWidth: 2,
        tension: 0.22,
      },
    ],
  };

  return (
    <InsightChartCard
      title="Catch vs MSY"
      subtitle={`${stock.name} · ${stock.subregion}`}
      hints={[
        "Red line is annual catch in thousand tonnes.",
        "Blue dashed line is estimated sustainable catch (MSY).",
        "Blue band is the uncertainty range around MSY.",
        "Hover any year to see whether catch is above or below MSY.",
      ]}
    >
      <Line
        data={data}
        options={{
          responsive: true,
          color: theme.muted,
          font: { family: theme.fontFamily, size: theme.fontSize },
          maintainAspectRatio: false,
          animation: false,
          plugins: {
            legend: {
              display: false,
              labels: {
                filter: (item) => !item.text.startsWith("Band"),
              },
            },
            tooltip: {
              backgroundColor: theme.surface, titleColor: theme.text, bodyColor: theme.text, borderColor: theme.grid, borderWidth: 1,
              mode: "index",
              intersect: false,
              filter: (ctx) => !(ctx.dataset.label ?? "").startsWith("Band"),
              callbacks: {
                title: (items) => `Year ${items[0]?.label}`,
                label: (ctx) => {
                  if (ctx.parsed.y === null) return "Unavailable";
                  if (ctx.dataset.label === "Catch") {
                    return `Catch: ${ctx.parsed.y.toFixed(2)} kt`;
                  }
                  if (ctx.dataset.label === "MSY") {
                    return `MSY: ${ctx.parsed.y.toFixed(2)} kt`;
                  }
                  return "";
                },
                afterBody: (items) => {
                  const catchItem = items.find((item) => item.dataset.label === "Catch");
                  if (!catchItem) {
                    return "";
                  }
                  const catchValue = catchItem.parsed.y as number;
                  const pct = (catchValue / stock.msyBsm) * 100;
                  const status = catchValue > stock.msyBsm ? "Above MSY pressure" : "Within MSY";
                  return `${status} (${pct.toFixed(0)}% of MSY)`;
                },
              },
            },
          },
          scales: {
            x: {
              grid: {
                color: theme.grid,
              },
              ticks: {
                color: theme.muted,
                autoSkip: true,
                maxTicksLimit: 7,
              },
            },
            y: {
              position: "left",
              min: 0,
              suggestedMax: Math.ceil((maxCatch + 2) / 5) * 5,
              title: {
                display: true,
                text: "Catch (1000 tonnes/year)",
                color: theme.muted,
              },
              grid: {
                color: theme.grid,
              },
            },
            yRight: {
              position: "right",
              min: 0,
              max: 2,
              grid: {
                drawOnChartArea: false,
              },
              ticks: {
                color: theme.muted,
                display: false,
              },
              title: {
                display: true,
                text: "B/BMSY",
                color: theme.muted,
              },
            },
          },
          interaction: {
            mode: "nearest",
            axis: "x",
            intersect: false,
          },
        }}
      />
    </InsightChartCard>
  );
};

export default CatchMsyChart;
