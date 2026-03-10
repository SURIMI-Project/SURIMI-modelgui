import europeanHakeDatasetCsv from "../assets/european_hake_dataset.csv?raw";

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

function normalizeCsvToken(token: string) {
  return token.trim().replace(/^\uFEFF/, "").replace(/^"(.*)"$/, "$1");
}

function parseSingleRowCsv(rawCsv: string) {
  const lines = rawCsv
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  const [headerRow, dataRow] = lines;

  if (!headerRow || !dataRow) {
    throw new Error("European hake CSV is missing header or data row.");
  }

  const headers = headerRow.split(",").map(normalizeCsvToken);
  const values = dataRow.split(",").map(normalizeCsvToken);

  if (headers.length !== values.length) {
    throw new Error(
      `European hake CSV column mismatch: ${headers.length} headers vs ${values.length} values.`,
    );
  }

  return headers.reduce<Record<string, string>>((acc, header, index) => {
    acc[header] = values[index] ?? "";
    return acc;
  }, {});
}

function getCell(row: Record<string, string>, key: string) {
  const normalizedKey = normalizeCsvToken(key);
  const direct = row[key] ?? row[normalizedKey];

  if (direct !== undefined) {
    return direct;
  }

  const match = Object.keys(row).find(
    (candidate) =>
      normalizeCsvToken(candidate).toLowerCase() === normalizedKey.toLowerCase(),
  );

  return match ? row[match] : undefined;
}

function parseMaybeNumber(rawValue: string | undefined) {
  const value = rawValue?.trim();

  if (!value || value === "NA") {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function readNumber(row: Record<string, string>, key: string) {
  const value = parseMaybeNumber(getCell(row, key));

  if (value === null) {
    throw new Error(`Expected numeric value for '${key}' in European hake CSV.`);
  }

  return value;
}

function readText(row: Record<string, string>, key: string) {
  const value = getCell(row, key)?.trim();

  if (!value) {
    throw new Error(`Expected text value for '${key}' in European hake CSV.`);
  }

  return value;
}

function yearSuffix(year: number) {
  return String(year % 100).padStart(2, "0");
}

const rawRow = parseSingleRowCsv(europeanHakeDatasetCsv);
const years = Array.from(
  { length: LAST_SUPPORTED_YEAR - FIRST_SUPPORTED_YEAR + 1 },
  (_, index) => FIRST_SUPPORTED_YEAR + index,
);

export const europeanHakeWestMediterraneanNorthSpain: StockMockData = {
  group: readText(rawRow, "Group"),
  region: readText(rawRow, "Region"),
  subregion: readText(rawRow, "Subregion"),
  name: readText(rawRow, "Name"),
  sciName: readText(rawRow, "SciName"),
  msyBsm: readNumber(rawRow, "MSY_BSM"),
  lclMsyBsm: readNumber(rawRow, "lcl.MSY_BSM"),
  uclMsyBsm: readNumber(rawRow, "ucl.MSY_BSM"),
  stockSize: {
    bmsy: readNumber(rawRow, "Bmsy"),
    lclBmsy: readNumber(rawRow, "lcl.Bmsy"),
    uclBmsy: readNumber(rawRow, "ucl.Bmsy"),
    defaultRatio: readNumber(rawRow, "rel_B_BSM"),
    unavailableRawValue: -1,
    series: years.map((year) => {
      const suffix = yearSuffix(year);
      return {
        year,
        biomass: parseMaybeNumber(rawRow[`B${suffix}`]),
        sourceColumn: `B${suffix}`,
      };
    }),
  },
  exploitation: {
    defaultRatio: readNumber(rawRow, "rel_F_BSM"),
    unavailableRawValue: -1,
    series: years.map((year) => {
      const suffix = yearSuffix(year);
      return {
        year,
        ratioRaw: parseMaybeNumber(rawRow[`F.Fmsy${suffix}`]),
        sourceColumn: `F.Fmsy${suffix}`,
      };
    }),
  },
  catches: years.map((year) => {
    const suffix = yearSuffix(year);
    return {
      year,
      catchKtonnes: parseMaybeNumber(rawRow[`c${suffix}`]),
      sourceColumn: `c${suffix}`,
    };
  }),
};
