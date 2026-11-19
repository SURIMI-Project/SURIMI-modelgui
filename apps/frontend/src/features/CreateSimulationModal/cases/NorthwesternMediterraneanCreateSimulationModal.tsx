import ScenarioCreateSimulationModal from "../ScenarioCreateSimulationModal";
import type { CreateSimulationModalProps } from "../types";

export default function NorthwesternMediterraneanCreateSimulationModal(props: CreateSimulationModalProps) {
  return <ScenarioCreateSimulationModal {...props} scenarioName="northwestern_med" caseLabel="Northwestern Mediterranean" />;
}
