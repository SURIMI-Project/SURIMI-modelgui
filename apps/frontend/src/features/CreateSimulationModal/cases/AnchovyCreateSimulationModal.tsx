import ScenarioCreateSimulationModal from "../ScenarioCreateSimulationModal";
import type { CreateSimulationModalProps } from "../types";

export default function AnchovyCreateSimulationModal(props: CreateSimulationModalProps) {
  return <ScenarioCreateSimulationModal {...props} scenarioName="anchovy_bay" caseLabel="Anchovy Bay" />;
}
