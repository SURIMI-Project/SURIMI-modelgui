import europeanHakeDatasetCsv from "./assets/european_hake_dataset.csv?raw";

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

const normalizeCsvCell = (token: string) => {
  return token.trim().replace(/^\uFEFF/, "").replace(/^"(.*)"$/, "$1");
};

const parseSingleRecordCsv = (rawCsv: string) => {
  const lines = rawCsv
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  const [headerRow, dataRow] = lines;

  if (!headerRow || !dataRow) {
    throw new Error("European hake CSV is missing header or data row.");
  }

  const headers = headerRow.split(",").map(normalizeCsvCell);
  const values = dataRow.split(",").map(normalizeCsvCell);

  if (headers.length !== values.length) {
    throw new Error(
      `European hake CSV column mismatch: ${headers.length} headers vs ${values.length} values.`,
    );
  }

  return headers.reduce<Record<string, string>>((acc, header, index) => {
    acc[header] = values[index] ?? "";
    return acc;
  }, {});
};

const resolveCellValue = (row: Record<string, string>, key: string) => {
  const normalizedKey = normalizeCsvCell(key);
  const direct = row[key] ?? row[normalizedKey];

  if (direct !== undefined) {
    return direct;
  }

  const match = Object.keys(row).find(
    (candidate) =>
      normalizeCsvCell(candidate).toLowerCase() === normalizedKey.toLowerCase(),
  );

  return match ? row[match] : undefined;
};

const parseOptionalNumber = (rawValue: string | undefined) => {
  const value = rawValue?.trim();

  if (!value || value === "NA") {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const readRequiredNumber = (row: Record<string, string>, key: string) => {
  const value = parseOptionalNumber(resolveCellValue(row, key));

  if (value === null) {
    throw new Error(`Expected numeric value for '${key}' in European hake CSV.`);
  }

  return value;
};

const readRequiredText = (row: Record<string, string>, key: string) => {
  const value = resolveCellValue(row, key)?.trim();

  if (!value) {
    throw new Error(`Expected text value for '${key}' in European hake CSV.`);
  }

  return value;
};

const formatYearSuffix = (year: number) => {
  return String(year % 100).padStart(2, "0");
};

const rawRow = parseSingleRecordCsv(europeanHakeDatasetCsv);
const years = Array.from(
  { length: LAST_SUPPORTED_YEAR - FIRST_SUPPORTED_YEAR + 1 },
  (_, index) => FIRST_SUPPORTED_YEAR + index,
);

export const europeanHakeWestMediterraneanNorthSpain: StockMockData = {
  group: readRequiredText(rawRow, "Group"),
  region: readRequiredText(rawRow, "Region"),
  subregion: readRequiredText(rawRow, "Subregion"),
  name: readRequiredText(rawRow, "Name"),
  sciName: readRequiredText(rawRow, "SciName"),
  msyBsm: readRequiredNumber(rawRow, "MSY_BSM"),
  lclMsyBsm: readRequiredNumber(rawRow, "lcl.MSY_BSM"),
  uclMsyBsm: readRequiredNumber(rawRow, "ucl.MSY_BSM"),
  stockSize: {
    bmsy: readRequiredNumber(rawRow, "Bmsy"),
    lclBmsy: readRequiredNumber(rawRow, "lcl.Bmsy"),
    uclBmsy: readRequiredNumber(rawRow, "ucl.Bmsy"),
    defaultRatio: readRequiredNumber(rawRow, "rel_B_BSM"),
    unavailableRawValue: -1,
    series: years.map((year) => {
      const suffix = formatYearSuffix(year);
      return {
        year,
        biomass: parseOptionalNumber(rawRow[`B${suffix}`]),
        sourceColumn: `B${suffix}`,
      };
    }),
  },
  exploitation: {
    defaultRatio: readRequiredNumber(rawRow, "rel_F_BSM"),
    unavailableRawValue: -1,
    series: years.map((year) => {
      const suffix = formatYearSuffix(year);
      return {
        year,
        ratioRaw: parseOptionalNumber(rawRow[`F.Fmsy${suffix}`]),
        sourceColumn: `F.Fmsy${suffix}`,
      };
    }),
  },
  catches: years.map((year) => {
    const suffix = formatYearSuffix(year);
    return {
      year,
      catchKtonnes: parseOptionalNumber(rawRow[`c${suffix}`]),
      sourceColumn: `c${suffix}`,
    };
  }),
};
