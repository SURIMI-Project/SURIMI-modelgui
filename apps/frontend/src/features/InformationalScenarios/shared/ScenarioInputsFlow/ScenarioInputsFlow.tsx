import Button from "../../../../components/ui/Button/Button";
import Select from "../../../../components/ui/Select/Select";
import { AnimatePresence, motion } from "framer-motion";
import { useMemo, useState } from "react";
import PrimaryModal from "../../../../components/PrimaryModal/PrimaryModal";
import SelectableCards from "../../../../components/SelectableCards/SelectableCards";
import styles from "./ScenarioInputsFlow.module.css";
import type {
  ScenarioInputsFlowConfig,
  ScenarioInputsFlowProps,
} from "./types";
import type { ScenarioRunInputDraft } from "../../../ScenarioRuns/types";

type ScenarioInputsFlowShellProps = ScenarioInputsFlowProps & {
  config: ScenarioInputsFlowConfig;
};

const MotionDiv = motion.div;

const ScenarioInputsFlow = ({
  config,
  isOpen,
  onClose,
  onComplete,
}: ScenarioInputsFlowShellProps) => {
  const [activeSpeciesId, setActiveSpeciesId] = useState<string>(
    config.speciesInputs[0]?.ID ?? "",
  );
  const [stepIndex, setStepIndex] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [selectedYears, setSelectedYears] = useState<number | null>(null);
  const [selectedIpccScenario, setSelectedIpccScenario] = useState<
    string | null
  >(null);

  const StepOneComponent = config.StepOneComponent;
  const activeStep = config.steps[stepIndex];

  const resetFlowState = () => {
    setStepIndex(0);
    setDirection(1);
    setActiveSpeciesId(config.speciesInputs[0]?.ID ?? "");
    setSelectedYears(null);
    setSelectedIpccScenario(null);
  };

  const handleClose = () => {
    resetFlowState();
    onClose();
  };

  const selectData = useMemo(() => {
    return config.speciesInputs.map((row) => ({
      value: row.ID,
      label: row.LABEL,
    }));
  }, [config.speciesInputs]);

  const goNext = () => {
    if (stepIndex !== 0) {
      return;
    }

    setDirection(1);
    setStepIndex(1);
  };

  const goBack = () => {
    if (stepIndex === 0) {
      handleClose();
      return;
    }

    setDirection(-1);
    setStepIndex((current) => current - 1);
  };

  const buildRunDraft = (
    durationYears: number,
    ipccScenario: string | null,
  ): ScenarioRunInputDraft => {
    const activeSpecies = config.speciesInputs.find(
      (species) => species.ID === activeSpeciesId,
    );

    return {
      speciesId: activeSpecies?.ID ?? activeSpeciesId,
      speciesLabel: activeSpecies?.LABEL ?? activeSpeciesId,
      durationYears,
      ipccScenario,
      harvestControlProfile: "Configured HCR curve",
    };
  };

  const completeFlow = (draft: ScenarioRunInputDraft) => {
    onComplete?.(draft);
    handleClose();
  };

  const handleYearSelect = (yearValue: string) => {
    const years = Number(yearValue);
    setSelectedYears(years);

    if (years > 10) {
      setDirection(1);
      setStepIndex(2);
      return;
    }

    completeFlow(buildRunDraft(years, null));
  };

  const handleIpccSelect = (scenarioValue: string) => {
    setSelectedIpccScenario(scenarioValue);
    completeFlow(buildRunDraft(selectedYears ?? 25, scenarioValue));
  };

  return (
    <div className={styles.modalHost}>
      <PrimaryModal
        opened={isOpen}
        onClose={handleClose}
        title={config.modalTitle}
        size="min(1280px, 96vw)"
        zIndex={6000}
        withinPortal={false}
        withOverlay
        overlayOpacity={0.72}
        overlayBlur={8}
        closeOnClickOutside={false}
      >
        <div
          className={[styles.flowRoot, styles.stackLayout1]
            .filter(Boolean)
            .join(" ")}
        >
          <div className={styles.flowHeading}>
            <div
              className={[styles.headingRow, styles.groupLayout2]
                .filter(Boolean)
                .join(" ")}
            >
              <div
                className={[styles.titleCluster, styles.groupLayout3]
                  .filter(Boolean)
                  .join(" ")}
              >
                <h2 className={styles.flowTitle}>{activeStep.title}</h2>
              </div>

              <div className={styles.groupLayout4}>
                {stepIndex === 0 ? (
                  <Select
                    className={styles.speciesSelect}
                    options={selectData}
                    selectedKey={activeSpeciesId}
                    label="Species"
                    onSelectionChange={(value) => {
                      if (value) {
                        setActiveSpeciesId(String(value));
                      }
                    }}
                    aria-label="Select species"
                    isRequired
                  />
                ) : null}
              </div>
            </div>

            <p className={styles.flowSubtitle}>{activeStep.subtitle}</p>
          </div>

          <div className={styles.stepViewport}>
            <AnimatePresence mode="wait" custom={direction}>
              {stepIndex === 0 ? (
                <StepOneComponent
                  direction={direction}
                  activeSpeciesId={activeSpeciesId}
                  onChangeActiveSpecies={setActiveSpeciesId}
                  speciesInputs={config.speciesInputs}
                />
              ) : null}

              {stepIndex === 1 ? (
                <MotionDiv
                  key={`${config.steps[1].key}-step`}
                  custom={direction}
                  initial={{
                    opacity: 0,
                    x: direction > 0 ? 52 : -52,
                    filter: "blur(3px)",
                  }}
                  animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
                  exit={{
                    opacity: 0,
                    x: direction > 0 ? -52 : 52,
                    filter: "blur(3px)",
                  }}
                  transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
                  className={styles.stepShell}
                >
                  <div
                    className={[styles.stepScrollArea, styles.scrollAreaLayout5]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    <div className={styles.stepContent}>
                      <div
                        className={[styles.reviewPanel, styles.paperLayout6]
                          .filter(Boolean)
                          .join(" ")}
                      >
                        <p className={styles.reviewTitle}>Run duration</p>

                        <p className={styles.finalText}>
                          Select one duration to continue.
                        </p>

                        <div className={styles.scrollAreaLayout7}>
                          <SelectableCards
                            options={config.yearOptions}
                            selectedValue={null}
                            onSelect={handleYearSelect}
                            columns={2}
                            className={styles.yearCards}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </MotionDiv>
              ) : null}

              {stepIndex === 2 ? (
                <MotionDiv
                  key={`${config.steps[2].key}-step`}
                  custom={direction}
                  initial={{
                    opacity: 0,
                    x: direction > 0 ? 52 : -52,
                    filter: "blur(3px)",
                  }}
                  animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
                  exit={{
                    opacity: 0,
                    x: direction > 0 ? -52 : 52,
                    filter: "blur(3px)",
                  }}
                  transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
                  className={styles.stepShell}
                >
                  <div>
                    <div className={styles.stepContent}>
                      <div
                        className={[styles.finalPanel, styles.paperLayout8]
                          .filter(Boolean)
                          .join(" ")}
                      >
                        <p className={styles.reviewTitle}>IPCC scenarios</p>

                        <p className={styles.finalText}>
                          {config.ipccDescription}
                        </p>

                        <div className={styles.scrollAreaLayout9}>
                          <SelectableCards
                            options={config.ipccOptions}
                            selectedValue={selectedIpccScenario}
                            onSelect={handleIpccSelect}
                            columns={2}
                            className={styles.ipccCards}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </MotionDiv>
              ) : null}
            </AnimatePresence>
          </div>

          <div
            className={[styles.footerActions, styles.groupLayout10]
              .filter(Boolean)
              .join(" ")}
          >
            <Button type="button" variant="primary-outlined" onPress={goBack}>
              {stepIndex === 0 ? "Cancel" : "Previous"}
            </Button>

            {stepIndex === 0 ? (
              <Button type="button" variant="primary" onPress={goNext}>
                Next
              </Button>
            ) : (
              <p className={styles.selectionHint}>
                Select one option to continue.
              </p>
            )}
          </div>
        </div>
      </PrimaryModal>
    </div>
  );
};

export default ScenarioInputsFlow;
