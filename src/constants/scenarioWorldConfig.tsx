import type { ComponentType } from "react";
import type { SimulationCaseId } from "../data/simulationCases";
import AegeanSeaFeature from "../features/InformationalScenarios/aegeanSea/AegeanSeaFeature";
import AnchovyBayFeature from "../features/InformationalScenarios/anchovyBay/AnchovyBayFeature";
import AnchovyInputsFlow, {
  type AnchovyInputsFlowProps,
} from "../features/InformationalScenarios/anchovyBay/components/AnchovyInputsFlow/AnchovyInputsFlow";
import WesternMediterraneanFeature from "../features/InformationalScenarios/westernMediterranean/WesternMediterraneanFeature";

export type ScenarioInputsFlowProps = AnchovyInputsFlowProps;

export type ScenarioWorldConfig = {
  worldTitle: string;
  aboutTitle: string;
  description: string[];
  simulationContext: string;
  infoModalTitle: string;
  infoModalDescription: string[];
  featureTitle: string;
  featureSubtitle: string;
  featureColumnMaxWidth?: number;
  accentColor: string;
  secondaryColor: string;
  glowColor: string;
  backgroundTopColor: string;
  backgroundBottomColor: string;
  backgroundHighlightColor: string;
  FeatureComponent: ComponentType;
  InputsFlowComponent?: ComponentType<ScenarioInputsFlowProps>;
};

const scenarioWorldById: Record<SimulationCaseId, ScenarioWorldConfig> = {
  "western-mediterranean": {
    worldTitle: "Western Mediterranean Emissions Field",
    aboutTitle: "About The Western Mediterranean",
    description: [
      "The Western Mediterranean hosts dense shipping corridors where vessel clusters generate localized pressure on marine air and water quality.",
      "Traffic intensity shifts rapidly between seasonal routes, creating dynamic hotspots that influence ecological exposure and coastal operations.",
      "This scenario lets you test how changes in route density and operational constraints alter regional stress patterns.",
    ],
    simulationContext:
      "Run comparative experiments between baseline traffic and constrained-corridor policies to inspect emissions and ecosystem stress propagation.",
    infoModalTitle: "Western Mediterranean · About the models behind",
    infoModalDescription: [
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer iaculis nisl at mauris facilisis, vitae finibus justo gravida. Aliquam erat volutpat.",
      "Suspendisse potenti. Curabitur luctus, libero sed maximus vulputate, justo lacus semper purus, sit amet tristique nulla neque eu nibh.",
      "Mauris suscipit, nisl nec volutpat gravida, massa velit laoreet odio, sed fermentum erat turpis ac neque. Phasellus feugiat sem sed risus accumsan pretium.",
    ],
    featureTitle: "Corridor Dynamics",
    featureSubtitle: "Shipping lanes and emission hubs update in real time.",
    accentColor: "#72f2e8",
    secondaryColor: "#8de8ff",
    glowColor: "rgba(92, 237, 214, 0.4)",
    backgroundTopColor: "#072342",
    backgroundBottomColor: "#020b18",
    backgroundHighlightColor: "rgba(100, 244, 224, 0.24)",
    FeatureComponent: WesternMediterraneanFeature,
  },
  "aegean-sea": {
    worldTitle: "Aegean Connectivity Mesh",
    aboutTitle: "About The Aegean Sea",
    description: [
      "The Aegean Sea combines fragmented island geography with high coastal activity, forming a sensitive network of ports, routes, and habitats.",
      "Flow between hubs can amplify local disturbances as traffic and environmental conditions interact across narrow corridors.",
      "This scenario helps evaluate how connectivity changes reshape both maritime performance and environmental pressure.",
    ],
    simulationContext:
      "Explore route-level what-if scenarios for port connectivity, corridor utilization, and downstream ecological exposure.",
    infoModalTitle: "Aegean Sea · About the models behind",
    infoModalDescription: [
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Donec sed risus purus. Vivamus nec posuere sapien, vitae feugiat ligula.",
      "Sed convallis, dui nec posuere euismod, lacus lacus ultrices risus, non vulputate sem magna sed orci. Nullam posuere, augue vel tincidunt tempor, justo erat luctus tortor, eu efficitur lectus mauris sed elit.",
      "Vestibulum ante ipsum primis in faucibus orci luctus et ultrices posuere cubilia curae; Integer volutpat mi et arcu tincidunt, at commodo ipsum posuere.",
    ],
    featureTitle: "Networked Port Ecology",
    featureSubtitle: "Transport links and drift patterns reveal pressure transfer paths.",
    accentColor: "#7ad6ff",
    secondaryColor: "#9af2ff",
    glowColor: "rgba(90, 211, 255, 0.42)",
    backgroundTopColor: "#08274f",
    backgroundBottomColor: "#031120",
    backgroundHighlightColor: "rgba(104, 210, 255, 0.24)",
    FeatureComponent: AegeanSeaFeature,
  },
  "anchovy-bay": {
    worldTitle: "Anchovy Bay",
    aboutTitle: "About Anchovy Bay",
    description: [
      "Anchovy Bay is a popular coastal ecosystem with historic fishing ports, where fisheries have long been the main economic activity.",
      "Catches have declined for decades and shifted from groundfish toward shrimp and pelagic species, reshaping trophic balance.",
      "Marine mammal populations have recovered after years of whaling and culling, increasing eco-tourism pressure and predator interactions.",
    ],
    simulationContext:
      "Test harvest-control adjustments and observe trophic balance responses under evolving predator and forage dynamics.",
    infoModalTitle: "Anchovy Bay · About the models behind",
    infoModalDescription: [
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Praesent blandit consequat commodo. Morbi feugiat nisl nisi, et faucibus lectus gravida ut.",
      "Quisque vulputate magna quis felis semper, nec dictum libero ullamcorper. Aenean posuere imperdiet efficitur. Donec in pulvinar justo.",
      "Nam sed orci a sapien rutrum tincidunt. Pellentesque ac urna sed justo pellentesque posuere a vitae sapien. Pellentesque habitant morbi tristique senectus et netus.",
    ],
    featureTitle: "Trophic Flow Network",
    featureSubtitle: "",
    featureColumnMaxWidth: 760,
    accentColor: "#88b4ff",
    secondaryColor: "#ffc69d",
    glowColor: "rgba(124, 171, 255, 0.44)",
    backgroundTopColor: "#13284f",
    backgroundBottomColor: "#060c1b",
    backgroundHighlightColor: "rgba(255, 193, 142, 0.24)",
    FeatureComponent: AnchovyBayFeature,
    InputsFlowComponent: AnchovyInputsFlow,
  },
};

export const getScenarioWorldConfig = (
  caseId: SimulationCaseId,
): ScenarioWorldConfig => {
  return scenarioWorldById[caseId];
};
