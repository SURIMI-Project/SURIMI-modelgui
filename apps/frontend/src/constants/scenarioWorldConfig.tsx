import { scenarioWorldContent } from "../../mock-data/content/caseIntroductions";
import type { ComponentType } from "react";
import type { SimulationCaseId } from "../data/simulationCases";
import AegeanSeaFeature from "../features/InformationalScenarios/aegeanSea/AegeanSeaFeature";
import AegeanSeaCreateSimulationModal from "../features/CreateSimulationModal/cases/AegeanSeaCreateSimulationModal";
import AnchovyBayFeature from "../features/InformationalScenarios/anchovyBay/AnchovyBayFeature";
import AnchovyCreateSimulationModal from "../features/CreateSimulationModal/cases/AnchovyCreateSimulationModal";
import type { CreateSimulationModalProps } from "../features/CreateSimulationModal/types";
import WesternMediterraneanFeature from "../features/InformationalScenarios/westernMediterranean/WesternMediterraneanFeature";
import WesternMediterraneanCreateSimulationModal from "../features/CreateSimulationModal/cases/WesternMediterraneanCreateSimulationModal";

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
  CreateSimulationModalComponent?: ComponentType<CreateSimulationModalProps>;
};

const scenarioWorldById: Record<SimulationCaseId, ScenarioWorldConfig> = {
  "northwestern-mediterranean": {
    ...scenarioWorldContent["northwestern-mediterranean"],
    FeatureComponent: WesternMediterraneanFeature,
    CreateSimulationModalComponent: WesternMediterraneanCreateSimulationModal,
  },
  "aegean-sea": {
    ...scenarioWorldContent["aegean-sea"],
    FeatureComponent: AegeanSeaFeature,
    CreateSimulationModalComponent: AegeanSeaCreateSimulationModal,
  },
  "anchovy-bay": {
    ...scenarioWorldContent["anchovy-bay"],
    FeatureComponent: AnchovyBayFeature,
    CreateSimulationModalComponent: AnchovyCreateSimulationModal,
  },
};

export const getScenarioWorldConfig = (
  caseId: SimulationCaseId,
): ScenarioWorldConfig => {
  return scenarioWorldById[caseId];
};
