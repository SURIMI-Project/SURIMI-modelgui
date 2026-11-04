import type { ComponentType } from "react";
import type { SelectableCardOption } from "../../../../components/SelectableCards/SelectableCards";
import type { ScenarioRunInputDraft } from "../../../ScenarioRuns/types";
import type { SpeciesInputPreset } from "../../anchovyBay/components/AnchovyInputsFlow/types";

export type ScenarioInputsFlowProps = {
  isOpen: boolean;
  onClose: () => void;
  onComplete?: (draft: ScenarioRunInputDraft) => void;
};

export type ScenarioInputsFlowStep = {
  key: string;
  title: string;
  subtitle: string;
};

export type ScenarioInputsInfoContent = {
  eyebrow: string;
  text: string;
  ariaLabel: string;
};

export type ScenarioInputsStepOneComponentProps = {
  direction: 1 | -1;
  activeSpeciesId: string;
  onChangeActiveSpecies: (id: string) => void;
  speciesInputs: readonly SpeciesInputPreset[];
};

export type ScenarioInputsFlowConfig = {
  modalTitle: string;
  steps: readonly [
    ScenarioInputsFlowStep,
    ScenarioInputsFlowStep,
    ScenarioInputsFlowStep,
  ];
  speciesInputs: readonly SpeciesInputPreset[];
  stepOneInfo: ScenarioInputsInfoContent;
  yearOptions: SelectableCardOption[];
  ipccOptions: SelectableCardOption[];
  ipccDescription: string;
  StepOneComponent: ComponentType<ScenarioInputsStepOneComponentProps>;
};
