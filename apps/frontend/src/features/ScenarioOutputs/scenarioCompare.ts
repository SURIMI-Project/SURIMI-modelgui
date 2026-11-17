import { readChartTheme, withAlpha } from "../../styles/chartTheme";
export { withAlpha } from "../../styles/chartTheme";

export const BASELINE_LABEL = "Baseline";
export const SCENARIO_ONE_LABEL = "Scenario 1";
export const SCENARIO_TWO_LABEL = "Scenario 2";

const series = (color: string | undefined) => ({ stroke: color ?? "", fill: withAlpha(color ?? "", 0.14), point: color ?? "" });

// Resolve on use, after the application stylesheet has loaded.
export const SCENARIO_COMPARE_COLORS = {
  get baseline() { return series(readChartTheme().baseline); },
  get scenarioOne() { return series(readChartTheme().series); },
  get scenarioTwo() { return series(readChartTheme().comparison); },
};
