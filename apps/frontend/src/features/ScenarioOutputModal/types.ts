import type { ExperimentDetail } from "../../network/services/experiments/experimentSchemas";

export type ScenarioOutputContentProps = { experiment: ExperimentDetail };
export type ScenarioOutputModalProps = {
  experimentId: string;
  scenarioName: string;
  isOpen: boolean;
  onClose: () => void;
};
