import type { ComponentType } from "react";
import type { SelectableCardOption } from "../../components/SelectableCards/SelectableCards";
import type { ScenarioRunInputDraft } from "../ScenarioRuns/types";
import type { SpeciesInputPreset } from "./components/HarvestControlInputs/types";

export type CreateSimulationModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onComplete?: (draft: ScenarioRunInputDraft) => void;
};

export type CreateSimulationModalStep = {
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

export type CreateSimulationModalConfig = {
  modalTitle: string;
  steps: readonly [
    CreateSimulationModalStep,
    CreateSimulationModalStep,
    CreateSimulationModalStep,
  ];
  speciesInputs: readonly SpeciesInputPreset[];
  stepOneInfo: ScenarioInputsInfoContent;
  yearOptions: SelectableCardOption[];
  ipccOptions: SelectableCardOption[];
  ipccDescription: string;
  StepOneComponent: ComponentType<ScenarioInputsStepOneComponentProps>;
};
