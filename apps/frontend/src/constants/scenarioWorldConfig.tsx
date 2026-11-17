import type { ComponentType } from "react";
import type { SimulationCaseId } from "../data/simulationCases";
import AegeanSeaCreateSimulationModal from "../features/CreateSimulationModal/cases/AegeanSeaCreateSimulationModal";
import AnchovyCreateSimulationModal from "../features/CreateSimulationModal/cases/AnchovyCreateSimulationModal";
import type { CreateSimulationModalProps } from "../features/CreateSimulationModal/types";
import WesternMediterraneanCreateSimulationModal from "../features/CreateSimulationModal/cases/WesternMediterraneanCreateSimulationModal";

export type ScenarioWorldConfig = {
  CreateSimulationModalComponent?: ComponentType<CreateSimulationModalProps>;
};

const scenarioWorldById: Record<SimulationCaseId, ScenarioWorldConfig> = {
  "northwestern-mediterranean": {
    CreateSimulationModalComponent: WesternMediterraneanCreateSimulationModal,
  },
  "aegean-sea": {
    CreateSimulationModalComponent: AegeanSeaCreateSimulationModal,
  },
  "anchovy-bay": {
    CreateSimulationModalComponent: AnchovyCreateSimulationModal,
  },
};

export const getScenarioWorldConfig = (
  caseId: SimulationCaseId,
): ScenarioWorldConfig => {
  return scenarioWorldById[caseId];
};
