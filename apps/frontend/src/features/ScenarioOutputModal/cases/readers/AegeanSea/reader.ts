import type { NetcdfCaseReader } from "../../../netcdf/readerConfiguration";

export const reader: NetcdfCaseReader = {
  scenarioName: "aegean_sea",
  createWorker: () => new Worker(new URL("./reader.worker.ts", import.meta.url), { type: "module" }),
};
