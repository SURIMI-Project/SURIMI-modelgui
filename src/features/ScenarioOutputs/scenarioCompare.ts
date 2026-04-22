export const BASELINE_LABEL = "Baseline";
export const SCENARIO_ONE_LABEL = "Scenario 1";
export const SCENARIO_TWO_LABEL = "Scenario 2";

export const SCENARIO_COMPARE_COLORS = {
  baseline: {
    stroke: "#ffb36b",
    fill: "rgba(255, 179, 107, 0.14)",
    point: "#ffb36b",
  },
  scenarioOne: {
    stroke: "#74dbff",
    fill: "rgba(116, 219, 255, 0.14)",
    point: "#74dbff",
  },
  scenarioTwo: {
    stroke: "#83f2c8",
    fill: "rgba(131, 242, 200, 0.14)",
    point: "#83f2c8",
  },
} as const;

export const withAlpha = (hexColor: string, alpha: number) => {
  const normalized = hexColor.replace("#", "");
  const expanded =
    normalized.length === 3
      ? normalized
          .split("")
          .map((part) => `${part}${part}`)
          .join("")
      : normalized;

  if (expanded.length !== 6) {
    return `rgba(214, 224, 235, ${alpha})`;
  }

  const red = Number.parseInt(expanded.slice(0, 2), 16);
  const green = Number.parseInt(expanded.slice(2, 4), 16);
  const blue = Number.parseInt(expanded.slice(4, 6), 16);

  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
};
