export type ScenarioOutputMetric = "biomass" | "catchesDiscards";

export type SpeciesRef = {
  species_code: string;
};

export type BiomassCell = {
  longitude: number;
  latitude: number;
  biomass: number;
};

export type BiomassGrid = {
  species: SpeciesRef;
  biomass_cells: BiomassCell[];
};

export type BiomassData = {
  biomass_grids: BiomassGrid[];
};

export type FleetSegment = {
  gear_code: string;
  country_code?: string;
};

export type DispositionCell = {
  longitude: number;
  latitude: number;
  gross_catch: number;
  live_discards: number;
  dead_discards: number;
};

export type CatchDispositionGrid = {
  fleet_segment: FleetSegment;
  species: SpeciesRef;
  disposition_cells: DispositionCell[];
};

export type CatchDispositionData = {
  disposition_grids: CatchDispositionGrid[];
};

export type PricePoint = {
  species: SpeciesRef;
  market_code: string;
  price: number;
  currency: string;
};

export type PricesData = {
  prices: PricePoint[];
};

export type SalesItem = {
  species: SpeciesRef;
  quantity: number;
  value: number;
};

export type SalesSummary = {
  market_code: string;
  currency: string;
  sales: SalesItem[];
};

export type SalesData = {
  sales_summaries: SalesSummary[];
};

export type FishingActivitySummary = {
  fleet_segment: FleetSegment;
  fishing_activity_ratio: number;
};

export type FishingActivityData = {
  FishingActivitySummary: FishingActivitySummary[];
};

export type ScenarioBounds = {
  xmin: number;
  xmax: number;
  ymin: number;
  ymax: number;
};

export type ScenarioSimulationMetadata = {
  scenario: string;
  run_id: string;
  created_at: string;
  coordinate_system: string;
  bounds: ScenarioBounds;
};

export type HeatPoint = {
  longitude: number;
  latitude: number;
  value: number;
  speciesCode: string;
};

export type AnnualMetricCell = {
  longitude: number;
  latitude: number;
  biomass: number;
  catches: number;
  discards: number;
};

export type AnnualMetricGrid = {
  year: number;
  cells: AnnualMetricCell[];
};

export type SpeciesAnnualOutput = {
  species_code: string;
  annual_grids: AnnualMetricGrid[];
};

export type AnchovyBayAnnualOutputsData = {
  years: number[];
  species_outputs: SpeciesAnnualOutput[];
};

export type SpeciesOption = {
  value: string;
  label: string;
};
