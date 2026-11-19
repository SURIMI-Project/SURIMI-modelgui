import type { NetcdfCaseConfiguration } from "../../../netcdf/readerConfiguration";

// Current species-based contract; evolve independently for this case.
export const configuration: NetcdfCaseConfiguration = {
  variables: {
    time: "time",
    species_code: "species_code",
    species_life_stage: "species_life_stage",
    lat: "lat",
    lon: "lon",
    biomass_total: "biomass_total",
    gross_catch_total: "gross_catch_total",
    live_discards_total: "live_discards_total",
    dead_discards_total: "dead_discards_total",
    sales_quantity: "sales_quantity",
    sales_value: "sales_value",
    biomass: "biomass",
    gross_catch: "gross_catch",
  },
  dimensions: {
    time: "time",
    species: "species",
    fleet: "fleet",
    market: "market",
    lat: "lat",
    lon: "lon",
  },
};
