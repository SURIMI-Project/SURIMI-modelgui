import {
  type ScenarioSpeciesDefinition,
} from "../outputs/createExampleDataset";

const normalizeCsvCell = (token: string) => {
  return token.trim().replace(/^\uFEFF/, "").replace(/^"(.*)"$/, "$1");
};

const slugifyGroupKey = (value: string) => {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
};

const parseCsvRows = (rawCsv: string) => {
  const lines = rawCsv
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  const [headerRow, ...dataRows] = lines;

  if (!headerRow) {
    throw new Error("Scenario species CSV is missing a header row.");
  }

  const headers = headerRow.split(",").map(normalizeCsvCell);

  return dataRows.map((row, rowIndex) => {
    const values = row.split(",").map(normalizeCsvCell);

    return headers.reduce<Record<string, string>>((accumulator, header, index) => {
      accumulator[header] = values[index] ?? "";
      return accumulator;
    }, { __rowIndex: String(rowIndex) });
  });
};

const readRequiredText = (row: Record<string, string>, key: string) => {
  const value = row[key]?.trim();

  if (!value) {
    throw new Error(`Expected '${key}' in scenario species CSV row.`);
  }

  return value;
};

const getBasePriceForGroup = (groupKey: string, index: number) => {
  const groupBasePrice: Record<string, number> = {
    crustaceans: 3.65,
    cephalopods: 3.1,
    large_demersal_fishes: 3.28,
    medium_demersal_fishes: 2.62,
    small_demersal_fishes: 1.94,
    small_pelagic_fishes: 1.76,
    medium_pelagic_fishes: 1.58,
    large_pelagic_fishes: 2.74,
    other_invertebrates: 2.28,
  };

  const basePrice = groupBasePrice[groupKey] ?? 2.1;
  const variation = ((index % 5) - 2) * 0.12;

  return Number((basePrice + variation).toFixed(2));
};

const getBaseSalesQuantityForGroup = (groupKey: string, index: number) => {
  const groupBaseQuantity: Record<string, number> = {
    crustaceans: 112,
    cephalopods: 126,
    large_demersal_fishes: 156,
    medium_demersal_fishes: 178,
    small_demersal_fishes: 164,
    small_pelagic_fishes: 248,
    medium_pelagic_fishes: 214,
    large_pelagic_fishes: 138,
    other_invertebrates: 96,
  };

  const baseQuantity = groupBaseQuantity[groupKey] ?? 140;
  const variation = (index % 6) * 14;

  return baseQuantity + variation;
};

export const createScenarioSpeciesDefinitions = (
  rawCsv: string,
): ScenarioSpeciesDefinition[] => {
  const rows = parseCsvRows(rawCsv);

  return rows.map((row, index) => {
    const code = readRequiredText(row, "Stock");
    const displayName = readRequiredText(row, "Name");
    const scientificName = readRequiredText(row, "SciName");
    const functionalGroupName = readRequiredText(row, "Group");
    const functionalGroupKey = slugifyGroupKey(functionalGroupName);

    return {
      code,
      displayName,
      scientificName,
      functionalGroupKey,
      functionalGroupName,
      basePrice: getBasePriceForGroup(functionalGroupKey, index),
      baseSalesQuantity: getBaseSalesQuantityForGroup(functionalGroupKey, index),
    };
  });
};
