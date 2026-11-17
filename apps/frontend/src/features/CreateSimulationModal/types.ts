import type { ComponentType } from "react";
import type { ScenarioRunInputDraft } from "../ScenarioRuns/types";
import type { SpeciesInputPreset } from "./components/HarvestControlInputs/types";

export type CreateSimulationModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onComplete?: (draft: ScenarioRunInputDraft) => void;
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
  speciesInputs: readonly SpeciesInputPreset[];
  stepOneInfo: ScenarioInputsInfoContent;
  yearOptions: ScenarioChoiceOption[];
  ipccOptions: ScenarioChoiceOption[];
  ipccDescription: string;
  InputsComponent: ComponentType<ScenarioInputsStepOneComponentProps>;
};

export type ScenarioChoiceOption = { value: string; title: string; description?: string; meta?: string };
