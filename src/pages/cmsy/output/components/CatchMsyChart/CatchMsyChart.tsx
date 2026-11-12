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

type CatchMsyChartProps = {
  stock: StockMockData;
};

const CatchMsyChart = ({ stock }: CatchMsyChartProps) => {
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
        borderColor: "rgba(0,0,0,0)",
        pointRadius: 0,
        tension: 0,
      },
      {
        label: "Band lower",
        data: lclSeries,
        borderColor: "rgba(0,0,0,0)",
        pointRadius: 0,
        tension: 0,
        fill: {
          target: 0,
          above: "rgba(97, 115, 176, 0.16)",
          below: "rgba(97, 115, 176, 0.16)",
        },
      },
      {
        label: "MSY",
        data: msySeries,
        borderColor: "#6173b0",
        borderDash: [7, 5],
        borderWidth: 2,
        pointRadius: 0,
        tension: 0,
      },
      {
        label: "Catch",
        data: catchSeries,
        borderColor: "#c62427",
        backgroundColor: "rgba(198, 36, 39, 0.1)",
        borderWidth: 2.5,
        pointRadius: 0,
        pointHoverRadius: 4,
        pointHoverBackgroundColor: "#c62427",
        pointHoverBorderColor: "#ffffff",
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
              mode: "index",
              intersect: false,
              filter: (ctx) => !(ctx.dataset.label ?? "").startsWith("Band"),
              callbacks: {
                title: (items: any) => `Year ${items[0]?.label}`,
                label: (ctx: any) => {
                  if (ctx.dataset.label === "Catch") {
                    return `Catch: ${ctx.parsed.y.toFixed(2)} kt`;
                  }
                  if (ctx.dataset.label === "MSY") {
                    return `MSY: ${ctx.parsed.y.toFixed(2)} kt`;
                  }
                  return "";
                },
                afterBody: (items: any) => {
                  const catchItem = items.find((item: any) => item.dataset.label === "Catch");
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
                color: "rgba(97,115,176,0.09)",
              },
              ticks: {
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
              },
              grid: {
                color: "rgba(97,115,176,0.09)",
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
                display: false,
              },
              title: {
                display: true,
                text: "B/BMSY",
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
