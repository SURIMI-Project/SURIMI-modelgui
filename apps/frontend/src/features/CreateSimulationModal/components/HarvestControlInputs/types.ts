export type SpeciesInputPreset = {
  ID: string;
  LABEL: string;
  BIOMASS_LIMIT: number;
  BIOMASS_BASE: number;
  F_MAX: number;
};

export type SpeciesInputRow = {
  id: string;
  label: string;
  biomassLimit: number;
  fMin: number;
  biomassBase: number;
  fMax: number;
  biomassBaseMax: number;
};

export type GraphPoint = {
  x: number;
  y: number;
};
