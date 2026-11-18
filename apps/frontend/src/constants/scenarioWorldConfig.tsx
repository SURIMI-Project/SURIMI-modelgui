import type { ComponentType } from "react";
import type { SimulationCaseId } from "../data/simulationCases";
import AegeanSeaCreateSimulationModal from "../features/CreateSimulationModal/cases/AegeanSeaCreateSimulationModal";
import AnchovyCreateSimulationModal from "../features/CreateSimulationModal/cases/AnchovyCreateSimulationModal";
import type { CreateSimulationModalProps } from "../features/CreateSimulationModal/types";
import NorthwesternMediterraneanCreateSimulationModal from "../features/CreateSimulationModal/cases/NorthwesternMediterraneanCreateSimulationModal";

export type ScenarioWorldConfig = {
  creationEnabled: boolean;
  CreateSimulationModalComponent?: ComponentType<CreateSimulationModalProps>;
};

const scenarioWorldById: Record<SimulationCaseId, ScenarioWorldConfig> = {
  "northwestern-mediterranean": {
    creationEnabled: true,
    CreateSimulationModalComponent: NorthwesternMediterraneanCreateSimulationModal,
  },
  "aegean-sea": {
    creationEnabled: true,
    CreateSimulationModalComponent: AegeanSeaCreateSimulationModal,
  },
  "anchovy-bay": {
    creationEnabled: true,
    CreateSimulationModalComponent: AnchovyCreateSimulationModal,
  },
};

export const getScenarioWorldConfig = (
  caseId: SimulationCaseId,
): ScenarioWorldConfig => {
  return scenarioWorldById[caseId];
};
