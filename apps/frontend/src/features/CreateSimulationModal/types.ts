import type { Experiment } from "../../network/services/experiments/experimentSchemas";

export type CreateSimulationModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onComplete?: (experiment: Experiment) => void;
};
