import { scenarioWorldContent } from "../../mock-data/content/caseIntroductions";
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
    ...scenarioWorldContent["northwestern-mediterranean"],
    FeatureComponent: WesternMediterraneanFeature,
    InputsFlowComponent: WesternMediterraneanInputsFlow,
  },
  "aegean-sea": {
    ...scenarioWorldContent["aegean-sea"],
    FeatureComponent: AegeanSeaFeature,
    InputsFlowComponent: AegeanSeaInputsFlow,
  },
  "anchovy-bay": {
    ...scenarioWorldContent["anchovy-bay"],
    FeatureComponent: AnchovyBayFeature,
    InputsFlowComponent: AnchovyInputsFlow,
  },
};

export const getScenarioWorldConfig = (
  caseId: SimulationCaseId,
): ScenarioWorldConfig => {
  return scenarioWorldById[caseId];
};
