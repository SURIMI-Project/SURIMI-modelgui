export type OutputSource = {
  id: string;
  name: string;
  scenarioName: string;
  sampleUrl?: string;
};
export type Variable = {
  name: string;
  dimensions: string[];
  shape: number[];
  attributes: Record<string, unknown>;
};
export type FileMetadata = {
  variables: Variable[];
  species: { key: string; code: string; stage: string; index: number }[];
  dates: string[];
  years: number[];
  lat: number[];
  lon: number[];
};
export type AnnualPoint = { year: number; samples: number; value: number | null };
export type SpeciesSeries = {
  biomass: AnnualPoint[];
  catches: AnnualPoint[];
  discards: AnnualPoint[];
  landings: AnnualPoint[];
  sales: AnnualPoint[];
  unitValue: AnnualPoint[];
};
export type OutputGrid = {
  year: number;
  metric: string;
  values: (number | null)[];
  samples: number;
};
export type ReaderResult = FileMetadata | SpeciesSeries | OutputGrid;
