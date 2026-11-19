import type { OutputSource } from "../src/features/ScenarioOutputModal/netcdf/types";

// Same public file used by /netcdf-lab. This is a local sample, not an API experiment.
export const sampleOutput: OutputSource = {
  id: "sample-northwestern-netcdf",
  name: "Northwestern · sample NetCDF",
  scenarioName: "northwestern_med",
  sampleUrl: "https://minio.dive.edito.eu/project-surimi/output_creator/experiments/99c1e2a4-5d3f-4e8a-9c6b-1f2a3d4e5f60/99c1e2a4-5d3f-4e8a-9c6b-1f2a3d4e5f60.nc",
};
