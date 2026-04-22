import { useEffect, useMemo, useState } from "react";
import type {
  ScenarioOutputMetric,
  ScenarioOutputsDataset,
  SpeciesOption,
} from "../types";

const PLAYBACK_STEP_MS = 900;

export const ALL_FUNCTIONAL_GROUPS_VALUE = "all";
export const ALL_SPECIES_VALUE = "all-species";

type UseScenarioDashboardStateArgs = {
  dataset: ScenarioOutputsDataset | null;
};

export type ScenarioDashboardState = {
  metric: ScenarioOutputMetric;
  onMetricChange: (next: ScenarioOutputMetric) => void;
  functionalGroupOptions: SpeciesOption[];
  selectedFunctionalGroup: string;
  filteredSpeciesOptions: SpeciesOption[];
  selectedSpeciesCodes: string[];
  selectedSpeciesLabels: string[];
  activeSpeciesLabel: string;
  onFunctionalGroupChange: (next: string) => void;
  onSpeciesChange: (next: string[]) => void;
  years: number[];
  currentYear: number;
  selectedYearIndex: number;
  isPlaying: boolean;
  isYearDockOpen: boolean;
  onTogglePlay: () => void;
  onSelectYear: (year: number) => void;
  onSelectYearByIndex: (index: number) => void;
  onToggleYearDock: () => void;
};

export const useScenarioDashboardState = ({
  dataset,
}: UseScenarioDashboardStateArgs): ScenarioDashboardState => {
  const years = dataset?.years ?? [];
  const functionalGroupOptions = dataset?.functionalGroupOptions ?? [
    { value: ALL_FUNCTIONAL_GROUPS_VALUE, label: "All functional groups" },
  ];
  const speciesPresentationByKey = dataset?.speciesPresentationByKey ?? {};
  const speciesOptions = useMemo<SpeciesOption[]>(() => {
    return (dataset?.species_outputs ?? [])
      .map((item) => item.species_code)
      .sort((a, b) => a.localeCompare(b))
      .map((speciesCode) => ({
        value: speciesCode,
        label:
          speciesPresentationByKey[speciesCode.toLowerCase()]?.displayName ??
          speciesCode,
      }));
  }, [dataset, speciesPresentationByKey]);

  const defaultFunctionalGroup =
    functionalGroupOptions.find(
      (option) => option.value === ALL_FUNCTIONAL_GROUPS_VALUE,
    )?.value ??
    functionalGroupOptions[0]?.value ??
    ALL_FUNCTIONAL_GROUPS_VALUE;
  const defaultSpecies = speciesOptions[0]?.value ?? "";

  const [metric, setMetric] = useState<ScenarioOutputMetric>("biomass");
  const [selectedFunctionalGroupState, setSelectedFunctionalGroupState] =
    useState(defaultFunctionalGroup);
  const [selectedSpeciesCodesState, setSelectedSpeciesCodesState] = useState<
    string[]
  >(defaultSpecies ? [defaultSpecies] : []);
  const [selectedYearState, setSelectedYearState] = useState<number>(
    years[0] ?? 0,
  );
  const [isPlaying, setIsPlaying] = useState(false);
  const [isYearDockOpen, setIsYearDockOpen] = useState(false);

  const selectedFunctionalGroup = functionalGroupOptions.some(
    (option) => option.value === selectedFunctionalGroupState,
  )
    ? selectedFunctionalGroupState
    : defaultFunctionalGroup;

  const filteredSpeciesOptions = useMemo(() => {
    if (
      selectedFunctionalGroup.length === 0 ||
      selectedFunctionalGroup === ALL_FUNCTIONAL_GROUPS_VALUE
    ) {
      return speciesOptions;
    }

    return [
      {
        value: ALL_SPECIES_VALUE,
        label: "All species",
        disabled: true,
      },
      ...speciesOptions.filter((option) => {
        return (
          speciesPresentationByKey[option.value.toLowerCase()]
            ?.functionalGroupKey === selectedFunctionalGroup
        );
      }),
    ];
  }, [selectedFunctionalGroup, speciesOptions, speciesPresentationByKey]);

  const validSpeciesValues = filteredSpeciesOptions
    .filter((option) => option.value !== ALL_SPECIES_VALUE)
    .map((option) => option.value);

  const selectedSpeciesCodes =
    selectedSpeciesCodesState.filter((value) =>
      validSpeciesValues.includes(value),
    ).length > 0
      ? selectedSpeciesCodesState.filter((value) =>
          validSpeciesValues.includes(value),
        )
      : validSpeciesValues.slice(0, 1);

  const selectedSpeciesLabels = selectedSpeciesCodes.map((speciesCode) => {
    return (
      speciesPresentationByKey[speciesCode.toLowerCase()]?.displayName ??
      speciesCode
    );
  });

  const activeSpeciesLabel =
    selectedSpeciesLabels.length === 0
      ? "No species selected"
      : selectedSpeciesLabels.length === 1
        ? selectedSpeciesLabels[0]
        : `${selectedSpeciesLabels[0]} +${selectedSpeciesLabels.length - 1} more`;

  const currentYear = years.includes(selectedYearState)
    ? selectedYearState
    : (years[0] ?? 0);
  const selectedYearIndex = Math.max(
    years.findIndex((year) => year === currentYear),
    0,
  );

  useEffect(() => {
    if (!isPlaying || years.length === 0) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setSelectedYearState((current) => {
        const currentValue = years.includes(current) ? current : years[0];
        const index = years.findIndex((year) => year === currentValue);
        if (index < 0) {
          return years[0];
        }

        return years[(index + 1) % years.length];
      });
    }, PLAYBACK_STEP_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [isPlaying, years]);

  const onMetricChange = (next: ScenarioOutputMetric) => {
    setMetric(next);
    setIsPlaying(false);
  };

  const onFunctionalGroupChange = (nextGroup: string) => {
    setSelectedFunctionalGroupState(nextGroup);
    setIsPlaying(false);

    if (nextGroup === ALL_FUNCTIONAL_GROUPS_VALUE) {
      return;
    }

    const matchingSpecies = speciesOptions
      .filter((option) => {
        return (
          speciesPresentationByKey[option.value.toLowerCase()]
            ?.functionalGroupKey === nextGroup
        );
      })
      .map((option) => option.value);

    if (matchingSpecies.length > 0) {
      setSelectedSpeciesCodesState(matchingSpecies);
    }
  };

  const onSpeciesChange = (nextSpecies: string[]) => {
    const cleanedSpecies = nextSpecies.filter(
      (value) => value !== ALL_SPECIES_VALUE,
    );

    if (cleanedSpecies.length === 0) {
      return;
    }

    setSelectedSpeciesCodesState(cleanedSpecies);
    setIsPlaying(false);

    const matchingGroups = new Set(
      cleanedSpecies.map(
        (speciesCode) =>
          speciesPresentationByKey[speciesCode.toLowerCase()]
            ?.functionalGroupKey ?? ALL_FUNCTIONAL_GROUPS_VALUE,
      ),
    );

    setSelectedFunctionalGroupState(
      matchingGroups.size === 1
        ? [...matchingGroups][0]
        : ALL_FUNCTIONAL_GROUPS_VALUE,
    );
  };

  const onSelectYear = (year: number) => {
    setIsPlaying(false);
    setSelectedYearState(year);
  };

  const onSelectYearByIndex = (index: number) => {
    const year = years[index];
    if (year) {
      onSelectYear(year);
    }
  };

  return {
    metric,
    onMetricChange,
    functionalGroupOptions,
    selectedFunctionalGroup,
    filteredSpeciesOptions,
    selectedSpeciesCodes,
    selectedSpeciesLabels,
    activeSpeciesLabel,
    onFunctionalGroupChange,
    onSpeciesChange,
    years,
    currentYear,
    selectedYearIndex,
    isPlaying,
    isYearDockOpen,
    onTogglePlay: () => {
      setIsPlaying((current) => !current);
    },
    onSelectYear,
    onSelectYearByIndex,
    onToggleYearDock: () => {
      setIsYearDockOpen((current) => !current);
    },
  };
};
