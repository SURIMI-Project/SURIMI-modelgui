import type { OutputSource } from "./netcdf/types";
import type { ExperimentDetail } from "../../network/services/experiments/experimentSchemas";

export type ScenarioOutputContentProps = ({ experiment: ExperimentDetail } | { sources: OutputSource[] }) & { onClose: () => void };
export type ScenarioOutputModalProps = {
  experimentId: string;
  comparisonId?: string;
  scenarioName?: string;
  isOpen: boolean;
  onClose: () => void;
};
