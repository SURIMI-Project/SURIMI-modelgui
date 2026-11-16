import CreateSimulationModal from "../CreateSimulationModal";
import type {
  CreateSimulationModalConfig,
  CreateSimulationModalProps,
} from "../types";
import AnchovyInputsStepOne from "../components/HarvestControlInputs/AnchovyInputsStepOne";
import {
  DEFAULT_SPECIES_INPUTS,
  HARVEST_CONTROL_INPUT_INFO,
  IPCC_OPTIONS,
  IPCC_SCENARIO_DESCRIPTION,
  YEAR_OPTIONS,
} from "../../../../mock-data/inputs";

const westernMediterraneanInputsFlowConfig: CreateSimulationModalConfig = {
  modalTitle: "Northwestern Mediterranean · Set up scenario",
  speciesInputs: DEFAULT_SPECIES_INPUTS,
  stepOneInfo: {
    eyebrow: "Harvest control rules",
    text: HARVEST_CONTROL_INPUT_INFO,
    ariaLabel: "Open harvest control input information",
  },
  yearOptions: YEAR_OPTIONS,
  ipccOptions: IPCC_OPTIONS,
  ipccDescription: IPCC_SCENARIO_DESCRIPTION,
  InputsComponent: AnchovyInputsStepOne,
};

const WesternMediterraneanCreateSimulationModal = (props: CreateSimulationModalProps) => {
  return (
    <CreateSimulationModal
      {...props}
      config={westernMediterraneanInputsFlowConfig}
    />
  );
};

export default WesternMediterraneanCreateSimulationModal;
