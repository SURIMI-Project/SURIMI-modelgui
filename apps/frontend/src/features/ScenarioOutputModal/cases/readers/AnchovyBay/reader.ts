import type { NetcdfCaseReader } from "../../../netcdf/readerConfiguration";

export const reader: NetcdfCaseReader = {
  scenarioName: "anchovy_bay",
  createWorker: () => new Worker(new URL("./reader.worker.ts", import.meta.url), { type: "module" }),
};
