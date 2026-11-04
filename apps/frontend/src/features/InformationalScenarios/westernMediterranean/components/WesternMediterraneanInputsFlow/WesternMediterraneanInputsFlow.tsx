import ScenarioInputsFlow from "../../../shared/ScenarioInputsFlow/ScenarioInputsFlow";
import type {
  ScenarioInputsFlowConfig,
  ScenarioInputsFlowProps,
} from "../../../shared/ScenarioInputsFlow/types";
import AnchovyInputsStepOne from "../../../anchovyBay/components/AnchovyInputsFlow/AnchovyInputsStepOne";
import {
  DEFAULT_SPECIES_INPUTS,
  HARVEST_CONTROL_INPUT_INFO,
  INPUT_FLOW_STEPS,
  IPCC_OPTIONS,
  IPCC_SCENARIO_DESCRIPTION,
  YEAR_OPTIONS,
} from "../../../anchovyBay/components/AnchovyInputsFlow/const";

const westernMediterraneanInputsFlowConfig: ScenarioInputsFlowConfig = {
  modalTitle: "Northwestern Mediterranean · Scenario definition",
  steps: INPUT_FLOW_STEPS,
  speciesInputs: DEFAULT_SPECIES_INPUTS,
  stepOneInfo: {
    eyebrow: "Harvest control rules",
    text: HARVEST_CONTROL_INPUT_INFO,
    ariaLabel: "Open harvest control input information",
  },
  yearOptions: YEAR_OPTIONS,
  ipccOptions: IPCC_OPTIONS,
  ipccDescription: IPCC_SCENARIO_DESCRIPTION,
  StepOneComponent: AnchovyInputsStepOne,
};

const WesternMediterraneanInputsFlow = (props: ScenarioInputsFlowProps) => {
  return (
    <ScenarioInputsFlow
      {...props}
      config={westernMediterraneanInputsFlowConfig}
    />
  );
};

export default WesternMediterraneanInputsFlow;
