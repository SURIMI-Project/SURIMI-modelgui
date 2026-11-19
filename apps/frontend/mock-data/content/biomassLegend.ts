import type { InformationLegendItem } from "../../src/features/ScenarioOutputs/components/InformationLegends/InformationLegends";
import { metricMeta } from "../../src/features/ScenarioOutputs/utils/scenarioSeriesBundle";

export const buildBiomassLegendItems = (): InformationLegendItem[] => {
  return [
    {
      label: "Modelled biomass line",
      description:
        "Scenario-colored line showing the smoothed biomass trajectory across the full time series.",
      marker: "line",
      color: metricMeta.biomass.lineColor,
    },
    {
      label: "Upper / lower bounds",
      description:
        "Shaded envelope around each biomass line indicating the visual uncertainty range.",
      marker: "band",
      color: metricMeta.biomass.lineColor,
    },
    {
      label: "Simulation points",
      description:
        "Red simulation dots marking the generated historical sample values.",
      marker: "dot",
      color: "#8f1f1c",
    },
    {
      label: "Selected year",
      description:
        "White highlighted marker showing the year currently selected across the dashboard.",
      marker: "ring",
      color: metricMeta.biomass.lineColor,
    },
    {
      label: "Forecast divider",
      description:
        "Vertical divider separating historical observations from projected years.",
      marker: "divider",
      color: "rgba(214, 224, 235, 0.48)",
    },
  ];
};

