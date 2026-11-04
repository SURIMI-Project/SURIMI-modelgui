export type CatchPoint = {
  year: number;
  catchKtonnes: number | null;
  sourceColumn: string;
};

export type StockSizePoint = {
  year: number;
  biomass: number | null;
  sourceColumn: string;
};

export type StockSizeData = {
  bmsy: number;
  lclBmsy: number;
  uclBmsy: number;
  defaultRatio: number;
  unavailableRawValue: number;
  series: StockSizePoint[];
};

export type ExploitationPoint = {
  year: number;
  ratioRaw: number | null;
  sourceColumn: string;
};

export type ExploitationData = {
  defaultRatio: number;
  unavailableRawValue: number;
  series: ExploitationPoint[];
};

export type StockMockData = {
  group: string;
  region: string;
  subregion: string;
  name: string;
  sciName: string;
  msyBsm: number;
  lclMsyBsm: number;
  uclMsyBsm: number;
  stockSize: StockSizeData;
  exploitation: ExploitationData;
  catches: CatchPoint[];
};

const FIRST_SUPPORTED_YEAR = 1985;
const LAST_SUPPORTED_YEAR = 2030;

const years = Array.from(
  { length: LAST_SUPPORTED_YEAR - FIRST_SUPPORTED_YEAR + 1 },
  (_, index) => FIRST_SUPPORTED_YEAR + index,
);

const clamp = (value: number, min: number, max: number) => {
  return Math.min(max, Math.max(min, value));
};

const formatYearSuffix = (year: number) => {
  return String(year % 100).padStart(2, "0");
};

const buildStockSizeSeries = (): StockSizePoint[] => {
  return years.map((year, index) => {
    const era = index / Math.max(years.length - 1, 1);
    const biomass =
      168 +
      Math.sin(era * Math.PI * 2.3) * 26 +
      Math.cos(era * Math.PI * 4.2) * 11 -
      era * 18;

    return {
      year,
      biomass: Number(clamp(biomass, 108, 224).toFixed(2)),
      sourceColumn: `B${formatYearSuffix(year)}`,
    };
  });
};

const buildExploitationSeries = (): ExploitationPoint[] => {
  return years.map((year, index) => {
    const era = index / Math.max(years.length - 1, 1);
    const ratio =
      0.86 +
      Math.sin(era * Math.PI * 2.8 + 0.7) * 0.18 +
      Math.cos(era * Math.PI * 1.4) * 0.08 +
      era * 0.11;

    return {
      year,
      ratioRaw: Number(clamp(ratio, 0.48, 1.34).toFixed(3)),
      sourceColumn: `F.Fmsy${formatYearSuffix(year)}`,
    };
  });
};

const buildCatchSeries = (): CatchPoint[] => {
  return years.map((year, index) => {
    const era = index / Math.max(years.length - 1, 1);
    const catchKtonnes =
      72 +
      Math.sin(era * Math.PI * 3.1 + 0.4) * 13 +
      Math.cos(era * Math.PI * 1.7) * 7 -
      era * 6;

    return {
      year,
      catchKtonnes: Number(clamp(catchKtonnes, 42, 98).toFixed(2)),
      sourceColumn: `c${formatYearSuffix(year)}`,
    };
  });
};

export const europeanHakeWestMediterraneanNorthSpain: StockMockData = {
  group: "Large demersal fishes",
  region: "West Mediterranean",
  subregion: "North_Spain",
  name: "European hake",
  sciName: "Merluccius merluccius",
  msyBsm: 1.02,
  lclMsyBsm: 0.88,
  uclMsyBsm: 1.16,
  stockSize: {
    bmsy: 162,
    lclBmsy: 146,
    uclBmsy: 178,
    defaultRatio: 1.04,
    unavailableRawValue: -1,
    series: buildStockSizeSeries(),
  },
  exploitation: {
    defaultRatio: 0.93,
    unavailableRawValue: -1,
    series: buildExploitationSeries(),
  },
  catches: buildCatchSeries(),
};
