import { kobeChartHints } from "../../../../../mock-data/content/chartDescriptions";
import {
  Chart as ChartJS,
  Filler,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
} from "chart.js";
import { Scatter } from "react-chartjs-2";
import type { StockMockData } from "../../../../../mock-data/cmsy";
import InsightChartCard from "../InsightChartCard/InsightChartCard";

ChartJS.register(LinearScale, PointElement, LineElement, Tooltip, Legend, Filler);

type KobeChartProps = {
  stock: StockMockData;
};

type KobePoint = {
  year: number;
  fRatio: number;
  bRatio: number;
  observed: boolean;
};

const normalizeBiomassValue = (rawBiomass: number, bmsy: number) => {
  let normalized = rawBiomass;
  while (normalized / bmsy > 2) {
    normalized /= 10;
  }
  return normalized;
};

const normalizeExploitationValue = (raw: number) => {
  let value = raw;
  while (value > 4.5) {
    value /= 10;
  }
  return value;
};

const buildEllipsePoints = (
  cx: number,
  cy: number,
  a: number,
  b: number,
  rotationDeg: number,
  count = 80,
) => {
  const rotation = (rotationDeg * Math.PI) / 180;
  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);
  const points: { x: number; y: number }[] = [];

  for (let i = 0; i <= count; i += 1) {
    const t = (2 * Math.PI * i) / count;
    const ex = a * Math.cos(t);
    const ey = b * Math.sin(t);
    points.push({
      x: cx + ex * cos - ey * sin,
      y: cy + ex * sin + ey * cos,
    });
  }

  return points;
};

const KobeChart = ({ stock }: KobeChartProps) => {
  const observedBiomassYears = stock.stockSize.series
    .filter(
      (point) =>
        point.biomass !== null &&
        point.biomass !== stock.stockSize.unavailableRawValue,
    )
    .map((point) => point.year);

  const observedExploitationYears = stock.exploitation.series
    .filter(
      (point) =>
        point.ratioRaw !== null &&
        point.ratioRaw !== stock.exploitation.unavailableRawValue,
    )
    .map((point) => point.year);

  const hasObservedWindow =
    observedBiomassYears.length > 0 && observedExploitationYears.length > 0;

  const firstObservedYear = hasObservedWindow
    ? Math.max(
        1985,
        Math.min(...observedBiomassYears),
        Math.min(...observedExploitationYears),
      )
    : 1985;

  const lastObservedYear = hasObservedWindow
    ? Math.min(
        Math.max(...observedBiomassYears),
        Math.max(...observedExploitationYears),
      )
    : 2012;

  const years =
    lastObservedYear >= firstObservedYear
      ? Array.from(
          { length: lastObservedYear - firstObservedYear + 1 },
          (_, index) => firstObservedYear + index,
        )
      : [firstObservedYear];

  const points: KobePoint[] = years.map((year) => {
    const bPoint = stock.stockSize.series.find((item) => item.year === year);
    const fPoint = stock.exploitation.series.find((item) => item.year === year);

    const bObserved =
      bPoint?.biomass !== null &&
      bPoint?.biomass !== undefined &&
      bPoint.biomass !== stock.stockSize.unavailableRawValue;
    const fObserved =
      fPoint?.ratioRaw !== null &&
      fPoint?.ratioRaw !== undefined &&
      fPoint.ratioRaw !== stock.exploitation.unavailableRawValue;

    let bRatio = stock.stockSize.defaultRatio;
    if (bObserved && bPoint?.biomass !== null && bPoint?.biomass !== undefined) {
      bRatio = normalizeBiomassValue(bPoint.biomass, stock.stockSize.bmsy) / stock.stockSize.bmsy;
    }

    let fRatio = stock.exploitation.defaultRatio;
    if (fObserved && fPoint?.ratioRaw !== null && fPoint?.ratioRaw !== undefined) {
      fRatio = normalizeExploitationValue(fPoint.ratioRaw);
    }

    return {
      year,
      fRatio,
      bRatio,
      observed: Boolean(bObserved && fObserved),
    };
  });

  const observedPoints = points.filter((point) => point.observed);
  const firstMarker = observedPoints[0] ?? points[0];
  const marker2005 = points.find((point) => point.year === 2005) ?? points[0];
  const lastMarker = observedPoints[observedPoints.length - 1] ?? points[points.length - 1];

  const ciCenterX = (marker2005.fRatio + lastMarker.fRatio) / 2;
  const ciCenterY = (marker2005.bRatio + lastMarker.bRatio) / 2;

  const ci50 = buildEllipsePoints(ciCenterX, ciCenterY, 0.17, 0.08, -25);
  const ci80 = buildEllipsePoints(ciCenterX, ciCenterY, 0.25, 0.12, -25);
  const ci95 = buildEllipsePoints(ciCenterX, ciCenterY, 0.34, 0.16, -25);

  const trajectory = points.map((point) => ({ x: point.fRatio, y: point.bRatio }));

  const data = {
    datasets: [
      {
        label: "95% C.I.",
        data: ci95,
        showLine: true,
        pointRadius: 0,
        borderWidth: 1,
        borderColor: "rgba(97,115,176,0.45)",
        backgroundColor: "rgba(97,115,176,0.12)",
        fill: true,
      },
      {
        label: "80% C.I.",
        data: ci80,
        showLine: true,
        pointRadius: 0,
        borderWidth: 1,
        borderColor: "rgba(97,115,176,0.58)",
        backgroundColor: "rgba(97,115,176,0.16)",
        fill: true,
      },
      {
        label: "50% C.I.",
        data: ci50,
        showLine: true,
        pointRadius: 0,
        borderWidth: 1,
        borderColor: "rgba(97,115,176,0.68)",
        backgroundColor: "rgba(97,115,176,0.2)",
        fill: true,
      },
      {
        label: "Trajectory",
        data: trajectory,
        showLine: true,
        pointRadius: 0,
        pointHoverRadius: 4,
        borderWidth: 1.5,
        borderColor: "#c62427",
        tension: 0.15,
      },
      {
        label: `${firstMarker.year}`,
        data: [{ x: firstMarker.fRatio, y: firstMarker.bRatio }],
        showLine: false,
        pointRadius: 5,
        pointHoverRadius: 6,
        pointStyle: "rect",
        borderColor: "#c62427",
        backgroundColor: "#fff",
      },
      {
        label: `${marker2005.year}`,
        data: [{ x: marker2005.fRatio, y: marker2005.bRatio }],
        showLine: false,
        pointRadius: 5,
        pointHoverRadius: 6,
        pointStyle: "circle",
        borderColor: "#c62427",
        backgroundColor: "#fff",
      },
      {
        label: `${lastMarker.year}`,
        data: [{ x: lastMarker.fRatio, y: lastMarker.bRatio }],
        showLine: false,
        pointRadius: 6,
        pointHoverRadius: 7,
        pointStyle: "triangle",
        borderColor: "#c62427",
        backgroundColor: "#fff",
      },
      {
        label: "x = 1",
        data: [
          { x: 1, y: 0 },
          { x: 1, y: 2.05 },
        ],
        showLine: true,
        pointRadius: 0,
        borderWidth: 1,
        borderDash: [3, 3],
        borderColor: "rgba(196,15,20,0.7)",
      },
      {
        label: "y = 1",
        data: [
          { x: 0, y: 1 },
          { x: 2.6, y: 1 },
        ],
        showLine: true,
        pointRadius: 0,
        borderWidth: 1,
        borderDash: [3, 3],
        borderColor: "rgba(196,15,20,0.7)",
      },
    ],
  };

  const getQuadrant = (x: number, y: number) => {
    if (y >= 1 && x <= 1) {
      return "Target zone";
    }
    if (y >= 1 && x > 1) {
      return "High pressure risk";
    }
    if (y < 1 && x <= 1) {
      return "Recovery zone";
    }
    return "Overfished + overfishing";
  };

  return (
    <InsightChartCard
      title="Kobe Plot (State vs Pressure)"
      subtitle="Combined stock health and fishing pressure trajectory"
      hints={kobeChartHints}
      height={360}
    >
      <Scatter
        data={data}
        options={{
          responsive: true,
          maintainAspectRatio: false,
          animation: false,
          plugins: {
            legend: {
              position: "right",
              align: "start",
              labels: {
                boxWidth: 14,
                filter: (item) => !["Trajectory", "x = 1", "y = 1"].includes(item.text),
              },
            },
            tooltip: {
              callbacks: {
                label: (ctx: any) => {
                  const x = ctx.parsed.x as number;
                  const y = ctx.parsed.y as number;
                  if (ctx.dataset.label.includes("C.I.")) {
                    return `${ctx.dataset.label} region`;
                  }
                  return `${ctx.dataset.label}: F/FMSY ${x.toFixed(2)}, B/BMSY ${y.toFixed(2)}`;
                },
                afterLabel: (ctx: any) => {
                  if (ctx.dataset.label.includes("C.I.")) {
                    return "";
                  }
                  const x = ctx.parsed.x as number;
                  const y = ctx.parsed.y as number;
                  return getQuadrant(x, y);
                },
              },
            },
          },
          scales: {
            x: {
              type: "linear",
              min: 0,
              max: 2.6,
              ticks: {
                stepSize: 0.5,
              },
              title: {
                display: true,
                text: "F / FMSY",
              },
              grid: {
                color: "rgba(97,115,176,0.09)",
              },
            },
            y: {
              min: 0,
              max: 2.05,
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

export default KobeChart;
