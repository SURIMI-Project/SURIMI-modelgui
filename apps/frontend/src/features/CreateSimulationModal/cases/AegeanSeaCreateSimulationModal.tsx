import ScenarioCreateSimulationModal from "../ScenarioCreateSimulationModal";
import type { CreateSimulationModalProps } from "../types";

export default function AegeanSeaCreateSimulationModal(props: CreateSimulationModalProps) {
  return <ScenarioCreateSimulationModal {...props} scenarioName="aegean_sea" caseLabel="Aegean Sea" />;
}
