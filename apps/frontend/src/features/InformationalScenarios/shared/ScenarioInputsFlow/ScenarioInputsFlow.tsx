import {
  Button,
  Group,
  Paper,
  ScrollArea,
  Select,
  Stack,
  Text,
  Title,
} from "@mantine/core";
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
        <Stack gap="sm" className={styles.flowRoot}>
          <div className={styles.flowHeading}>
            <Group
              justify="space-between"
              align="center"
              gap="sm"
              className={styles.headingRow}
            >
              <Group gap="xs" align="center" className={styles.titleCluster}>
                <Title order={2} className={styles.flowTitle}>
                  {activeStep.title}
                </Title>

                {/* {stepIndex === 0 ? (
                  <Popover
                    width={380}
                    position="bottom-start"
                    offset={12}
                    shadow="lg"
                    withinPortal={false}
                    classNames={{ dropdown: styles.infoDropdown }}
                  >
                    <Popover.Target>
                      <UnstyledButton
                        type="button"
                        className={styles.infoTrigger}
                        aria-label={config.stepOneInfo.ariaLabel}
                      >
                        <FiInfo aria-hidden="true" />
                      </UnstyledButton>
                    </Popover.Target>

                    <Popover.Dropdown>
                      <div className={styles.infoPanel}>
                        <Text className={styles.infoEyebrow}>
                          {config.stepOneInfo.eyebrow}
                        </Text>
                        <Text className={styles.infoText}>
                          {config.stepOneInfo.text}
                        </Text>
                      </div>
                    </Popover.Dropdown>
                  </Popover>
                ) : null} */}
              </Group>

              <Group gap="xs">
                {stepIndex === 0 ? (
                  <Select
                    className={styles.speciesSelect}
                    data={selectData}
                    value={activeSpeciesId}
                    comboboxProps={{ withinPortal: true, zIndex: 6200 }}
                    searchable
                    nothingFoundMessage="No species found"
                    onChange={(value) => {
                      if (value) {
                        setActiveSpeciesId(value);
                      }
                    }}
                    aria-label="Select species"
                    allowDeselect={false}
                  />
                ) : null}
              </Group>
            </Group>

            <Text className={styles.flowSubtitle}>{activeStep.subtitle}</Text>
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
                  <ScrollArea
                    className={styles.stepScrollArea}
                    type="auto"
                    offsetScrollbars
                    scrollbarSize={8}
                    classNames={{ thumb: "thumb" }}
                  >
                    <div className={styles.stepContent}>
                      <Paper className={styles.reviewPanel} withBorder>
                        <Text className={styles.reviewTitle}>Run duration</Text>

                        <Text className={styles.finalText}>
                          Select one duration to continue.
                        </Text>

                        <ScrollArea
                          type="auto"
                          h={420}
                          offsetScrollbars
                          scrollbarSize={8}
                        >
                          <SelectableCards
                            options={config.yearOptions}
                            selectedValue={null}
                            onSelect={handleYearSelect}
                            columns={2}
                            className={styles.yearCards}
                          />
                        </ScrollArea>
                      </Paper>
                    </div>
                  </ScrollArea>
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
                      <Paper className={styles.finalPanel} withBorder>
                        <Text className={styles.reviewTitle}>
                          IPCC scenarios
                        </Text>

                        <Text className={styles.finalText}>
                          {config.ipccDescription}
                        </Text>

                        <ScrollArea
                          type="auto"
                          h={420}
                          offsetScrollbars
                          scrollbarSize={8}
                        >
                          <SelectableCards
                            options={config.ipccOptions}
                            selectedValue={selectedIpccScenario}
                            onSelect={handleIpccSelect}
                            columns={2}
                            className={styles.ipccCards}
                          />
                        </ScrollArea>
                      </Paper>
                    </div>
                  </div>
                </MotionDiv>
              ) : null}
            </AnimatePresence>
          </div>

          <Group justify="space-between" className={styles.footerActions}>
            <Button type="button" variant="primaryOutlined" onClick={goBack}>
              {stepIndex === 0 ? "Cancel" : "Previous"}
            </Button>

            {stepIndex === 0 ? (
              <Button type="button" variant="primaryFilled" onClick={goNext}>
                Next
              </Button>
            ) : (
              <Text className={styles.selectionHint}>
                Select one option to continue.
              </Text>
            )}
          </Group>
        </Stack>
      </PrimaryModal>
    </div>
  );
};

export default ScenarioInputsFlow;
