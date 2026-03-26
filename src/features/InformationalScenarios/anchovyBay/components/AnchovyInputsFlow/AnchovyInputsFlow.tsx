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
import PrimaryModal from "../../../../../components/PrimaryModal/PrimaryModal";
import SelectableCards from "../../../../../components/SelectableCards/SelectableCards";
import {
  DEFAULT_SPECIES_INPUTS,
  INPUT_FLOW_STEPS,
  IPCC_OPTIONS,
  YEAR_OPTIONS,
} from "./const";
import AnchovyInputsStepOne from "./AnchovyInputsStepOne";
import styles from "./AnchovyInputsFlow.module.css";

export type AnchovyInputsFlowProps = {
  isOpen: boolean;
  onClose: () => void;
  onComplete?: () => void;
};
const MotionDiv = motion.div;

const AnchovyInputsFlow = ({
  isOpen,
  onClose,
  onComplete,
}: AnchovyInputsFlowProps) => {
  const [activeSpeciesId, setActiveSpeciesId] = useState<string>(
    DEFAULT_SPECIES_INPUTS[0]?.ID ?? "",
  );
  const [stepIndex, setStepIndex] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [selectedYears, setSelectedYears] = useState<number | null>(null);
  const [selectedIpccScenario, setSelectedIpccScenario] = useState<
    string | null
  >(null);

  const resetFlowState = () => {
    setStepIndex(0);
    setDirection(1);
    setSelectedYears(null);
    setSelectedIpccScenario(null);
  };

  const handleClose = () => {
    resetFlowState();
    onClose();
  };
  const selectData = useMemo(() => {
    return DEFAULT_SPECIES_INPUTS.map((row) => ({
      value: row.ID,
      label: row.LABEL,
    }));
  }, []);

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

  const handleYearSelect = (yearValue: string) => {
    const years = Number(yearValue);
    setSelectedYears(years);

    if (years > 10) {
      setDirection(1);
      setStepIndex(2);
      return;
    }

    onComplete?.();
    handleClose();
  };

  const handleIpccSelect = (scenarioValue: string) => {
    setSelectedIpccScenario(scenarioValue);
    onComplete?.();
    handleClose();
  };

  return (
    <div className={styles.modalHost}>
      <PrimaryModal
        opened={isOpen}
        onClose={handleClose}
        title="Anchovy Bay · Inputs Flow"
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
              <Title order={2} className={styles.flowTitle}>
                {INPUT_FLOW_STEPS[stepIndex].title}
              </Title>

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

            <Text className={styles.flowSubtitle}>
              {INPUT_FLOW_STEPS[stepIndex].subtitle}
            </Text>
          </div>

          <div className={styles.stepViewport}>
            <AnimatePresence mode="wait" custom={direction}>
              {stepIndex === 0 ? (
                <AnchovyInputsStepOne
                  direction={direction}
                  activeSpeciesId={activeSpeciesId}
                  onChangeActiveSpecies={setActiveSpeciesId}
                />
              ) : null}

              {stepIndex === 1 ? (
                <MotionDiv
                  key="anchovy-input-step-2"
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
                            options={YEAR_OPTIONS}
                            selectedValue={selectedYears?.toString() ?? null}
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
                  key="anchovy-input-step-3"
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
                          Selected duration: {selectedYears} years.
                        </Text>

                        <ScrollArea
                          type="auto"
                          h={420}
                          offsetScrollbars
                          scrollbarSize={8}
                        >
                          <SelectableCards
                            options={IPCC_OPTIONS}
                            selectedValue={selectedIpccScenario}
                            onSelect={handleIpccSelect}
                            columns={1}
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

export default AnchovyInputsFlow;
