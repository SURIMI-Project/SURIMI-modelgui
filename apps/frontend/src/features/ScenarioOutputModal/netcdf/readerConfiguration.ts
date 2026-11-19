export type NetcdfCaseConfiguration = {
  // Canonical dashboard name -> name stored in this case's file.
  variables: Record<string, string>;
  dimensions: Record<string, string>;
};
export type NetcdfCaseReader = {
  scenarioName: string;
  createWorker: () => Worker;
};
