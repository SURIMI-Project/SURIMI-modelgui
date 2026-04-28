import type { ComponentType } from "react";
import type { SimulationCaseId } from "../data/simulationCases";
import AegeanSeaFeature from "../features/InformationalScenarios/aegeanSea/AegeanSeaFeature";
import AegeanSeaInputsFlow from "../features/InformationalScenarios/aegeanSea/components/AegeanSeaInputsFlow/AegeanSeaInputsFlow";
import AnchovyBayFeature from "../features/InformationalScenarios/anchovyBay/AnchovyBayFeature";
import AnchovyInputsFlow from "../features/InformationalScenarios/anchovyBay/components/AnchovyInputsFlow/AnchovyInputsFlow";
import type { ScenarioInputsFlowProps } from "../features/InformationalScenarios/shared/ScenarioInputsFlow/types";
import WesternMediterraneanFeature from "../features/InformationalScenarios/westernMediterranean/WesternMediterraneanFeature";
import WesternMediterraneanInputsFlow from "../features/InformationalScenarios/westernMediterranean/components/WesternMediterraneanInputsFlow/WesternMediterraneanInputsFlow";

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
  FeatureComponent: ComponentType<{
    onOpenInfoModal?: () => void;
  }>;
  InputsFlowComponent?: ComponentType<ScenarioInputsFlowProps>;
};

const scenarioWorldById: Record<SimulationCaseId, ScenarioWorldConfig> = {
  "northwestern-mediterranean": {
    worldTitle: "Northwestern Mediterranean Sea",
    aboutTitle: "About this Case Study",
    description: [
      "The Western Mediterranean Sea is a large and diverse marine area, covering both shallow coasts and deep waters. It is one of the most productive parts of the Mediterranean, especially near rivers like the Rhône and Ebro, which bring nutrients that support rich marine life. The region is home to many species, including fish, seabirds, turtles, and marine mammals, making it an important and biologically diverse ecosystem.",
      "However, this area is under increasing pressure from climate change and fishing. Rising temperatures and more frequent heatwaves are affecting marine habitats and fish populations, while species are shifting to new areas in response to changing conditions. At the same time, fishing continues to impact the ecosystem. Together, these pressures could lead to declines in fish stocks and changes in the balance of marine life.",
      "To address this, experts recommend better fishing practices, protected marine areas, and flexible management strategies that can adapt to changing environmental conditions.",
    ],
    // description: [
    //   "The Northwestern Mediterranean hosts dense shipping corridors where vessel clusters generate localized pressure on marine air and water quality.",
    //   "Traffic intensity shifts rapidly between seasonal routes, creating dynamic hotspots that influence ecological exposure and coastal operations.",
    //   "This scenario lets you test how changes in route density and operational constraints alter regional stress patterns.",
    // ],
    simulationContext:
      "Run comparative experiments between baseline traffic and constrained-corridor policies to inspect emissions and ecosystem stress propagation.",
    infoModalTitle: "Northwestern Mediterranean · About the models behind",
    infoModalDescription: [
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer iaculis nisl at mauris facilisis, vitae finibus justo gravida. Aliquam erat volutpat.",
      "Suspendisse potenti. Curabitur luctus, libero sed maximus vulputate, justo lacus semper purus, sit amet tristique nulla neque eu nibh.",
      "Mauris suscipit, nisl nec volutpat gravida, massa velit laoreet odio, sed fermentum erat turpis ac neque. Phasellus feugiat sem sed risus accumsan pretium.",
    ],
    featureTitle: "",
    featureSubtitle: "",
    featureColumnMaxWidth: 860,
    accentColor: "#72f2e8",
    secondaryColor: "#8de8ff",
    glowColor: "rgba(92, 237, 214, 0.4)",
    backgroundTopColor: "#072342",
    backgroundBottomColor: "#020b18",
    backgroundHighlightColor: "rgba(100, 244, 224, 0.24)",
    FeatureComponent: WesternMediterraneanFeature,
    InputsFlowComponent: WesternMediterraneanInputsFlow,
  },
  "aegean-sea": {
    worldTitle: "Aegean Sea",
    aboutTitle: "About this Case Study",
    description: [
      "The Aegean Sea is a relatively closed area in the eastern Mediterranean Sea, located between Greece and Turkey, with numerous islands and islets. It is considered as one of the most productive areas of the eastern Mediterranean basin, especially its northern part, facing however the dangers of overfishing, increasing temperature and alien species invasion, but to a lesser extent up till now than the Levantine Sea. In the north, the inflow of nutrient-rich and lower salinity waters originating from the Black Sea and large rivers supports large biomass of commercially important small and medium pelagic fishes.",
      "Over 100 fish and invertebrate Aegean Sea stocks have been assessed in the area and most of the them are either exploited or over-exploited. Commercial fisheries landings include economically important fish species (mainly European pilchard Sardina pilchardus, European anchovy Engraulis encrasicolus, European hake Merluccius merluccius and red mullet Mullus barbatus) as well as crustaceans and cephalopods.",
      "There is a considerable difference in fisheries catches between pelagic and demersal habitats, as well as between the northern, central and southern parts of the area. Over 95% of the fishing vessels operating in the Aegean Sea are small-sclae coastal vessels.",
    ],
    simulationContext:
      "Explore route-level what-if scenarios for port connectivity, corridor utilization, and downstream ecological exposure.",
    infoModalTitle: "Aegean Sea · About the models behind",
    infoModalDescription: [
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Donec sed risus purus. Vivamus nec posuere sapien, vitae feugiat ligula.",
      "Sed convallis, dui nec posuere euismod, lacus lacus ultrices risus, non vulputate sem magna sed orci. Nullam posuere, augue vel tincidunt tempor, justo erat luctus tortor, eu efficitur lectus mauris sed elit.",
      "Vestibulum ante ipsum primis in faucibus orci luctus et ultrices posuere cubilia curae; Integer volutpat mi et arcu tincidunt, at commodo ipsum posuere.",
    ],
    featureTitle: "",
    featureSubtitle: "",
    featureColumnMaxWidth: 860,
    accentColor: "#7ad6ff",
    secondaryColor: "#9af2ff",
    glowColor: "rgba(90, 211, 255, 0.42)",
    backgroundTopColor: "#08274f",
    backgroundBottomColor: "#031120",
    backgroundHighlightColor: "rgba(104, 210, 255, 0.24)",
    FeatureComponent: AegeanSeaFeature,
    InputsFlowComponent: AegeanSeaInputsFlow,
  },
  "anchovy-bay": {
    worldTitle: "Anchovy Bay",
    aboutTitle: "About this Case Study",
    description: [
      // was the old first paragraph
      // "Α fictional/demo model acting like a “flight simulator” that shows how the SURIMI models work with each other.",
      "A Model of Intermediate Complexity for Ecosystem assessments (MICE) developed for educational purposes and adopted to demonstrate the capabilities of the SURIMI model complex for a rather simple ecosystem representation.",
      "Anchovy Bay is a popular coastal ecosystem with historic fishing ports, where fisheries have long been the main economic activity.",
      "Catches have declined for decades and shifted from groundfish toward shrimp and pelagic species, reshaping trophic balance.",
      // "Marine mammal populations have recovered after years of whaling and culling, increasing eco-tourism pressure and predator interactions.",
      "Marine mammal populations have recovered after years of whaling and culling promoting eco-tourism but also leading to ecosystem changes and competition with fisheries.",
    ],
    simulationContext:
      "Test harvest-control adjustments and observe trophic balance responses under evolving predator and forage dynamics.",
    infoModalTitle: "Anchovy Bay · About the models behind",
    infoModalDescription: [
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Praesent blandit consequat commodo. Morbi feugiat nisl nisi, et faucibus lectus gravida ut.",
      "Quisque vulputate magna quis felis semper, nec dictum libero ullamcorper. Aenean posuere imperdiet efficitur. Donec in pulvinar justo.",
      "Nam sed orci a sapien rutrum tincidunt. Pellentesque ac urna sed justo pellentesque posuere a vitae sapien. Pellentesque habitant morbi tristique senectus et netus.",
    ],
    featureTitle: "",
    featureSubtitle: "",
    featureColumnMaxWidth: 860,
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
