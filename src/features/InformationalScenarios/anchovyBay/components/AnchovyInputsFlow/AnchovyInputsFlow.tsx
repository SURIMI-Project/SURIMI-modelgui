import {
  Button,
  Group,
  Paper,
  ScrollArea,
  Select,
  Stack,
  Table,
  Text,
  Title,
} from "@mantine/core";
import {
  type ActiveElement,
  Chart as ChartJS,
  type ChartEvent,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  type ScriptableLineSegmentContext,
  Tooltip,
  type ChartOptions,
} from "chart.js";
import dragDataPlugin from "chartjs-plugin-dragdata";
import { AnimatePresence, motion } from "framer-motion";
import { useMemo, useRef, useState } from "react";
import { Line } from "react-chartjs-2";
import PrimaryModal from "../../../../../components/PrimaryModal/PrimaryModal";
import SelectableCards, {
  type SelectableCardOption,
} from "../../../../../components/SelectableCards/SelectableCards";
import styles from "./AnchovyInputsFlow.module.css";

ChartJS.register(
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
  Legend,
  dragDataPlugin,
);

type SpeciesInputRow = {
  id: string;
  label: string;
  biomassLimit: number;
  fStart: number;
  fLimit: number;
  biomassBase: number;
  fMax: number;
};

export type AnchovyInputsFlowProps = {
  isOpen: boolean;
  onClose: () => void;
  onComplete?: () => void;
};

const YEAR_OPTIONS: SelectableCardOption[] = [
  {
    value: "50",
    title: "50 years",
    description: "Long-horizon ecosystem run.",
  },
  {
    value: "25",
    title: "25 years",
    description: "Extended scenario exploration.",
  },
  {
    value: "10",
    title: "10 years",
    description: "Default model-run duration.",
  },
  { value: "5", title: "5 years", description: "Short calibration window." },
];

const IPCC_OPTIONS: SelectableCardOption[] = [
  {
    value: "ssp1-1.9",
    title: "SSP1-1.9",
    meta: "Sustainability / very low emissions",
    description:
      "Strong global cooperation, rapid decarbonisation. Warming ~1.4-1.8 C.",
  },
  {
    value: "ssp1-2.6",
    title: "SSP1-2.6",
    meta: "Sustainability / low emissions",
    description:
      "Similar to RCP2.6 trajectory with controlled emissions. Warming ~1.8-2 C.",
  },
  {
    value: "ssp2-4.5",
    title: "SSP2-4.5",
    meta: "Middle of the road / moderate mitigation",
    description: "Current-policy-like trajectory. Warming ~2.5-3 C.",
  },
  {
    value: "ssp3-7.0",
    title: "SSP3-7.0",
    meta: "Regional rivalry / fragmentation",
    description:
      "Weak cooperation and high population growth. Warming ~3.5-4 C.",
  },
  {
    value: "ssp5-8.5",
    title: "SSP5-8.5",
    meta: "Fossil-fueled development / high emissions",
    description: "Rapid growth with heavy fossil fuel use. Warming ~4-5 C.",
  },
];

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

const toFixedValue = (value: number, digits = 3) =>
  Number(value.toFixed(digits));

const formatDisplayValue = (value: number) => value.toFixed(2);
const MIN_F_GAP = 0.01;

const clampStartPoint = (row: SpeciesInputRow, yValue: number) => {
  return {
    ...row,
    fStart: clamp(yValue, 0, Math.max(0, row.fLimit - MIN_F_GAP)),
  };
};

const clampMiddlePoint = (
  row: SpeciesInputRow,
  xValue: number,
  yValue: number,
) => {
  return {
    ...row,
    biomassLimit: clamp(xValue, 0.1, Math.max(0.1, row.biomassBase - 0.1)),
    fLimit: clamp(
      yValue,
      row.fStart + MIN_F_GAP,
      Math.max(row.fStart + MIN_F_GAP, row.fMax - MIN_F_GAP),
    ),
  };
};

const clampEndPoint = (
  row: SpeciesInputRow,
  xValue: number,
  yValue: number,
  xMax: number,
) => {
  return {
    ...row,
    biomassBase: clamp(xValue, row.biomassLimit + 0.1, xMax),
    fMax: clamp(yValue, row.fLimit + MIN_F_GAP, 1),
  };
};

const persistRowPrecision = (row: SpeciesInputRow): SpeciesInputRow => {
  return {
    ...row,
    biomassLimit: toFixedValue(row.biomassLimit),
    fStart: toFixedValue(row.fStart, 2),
    fLimit: toFixedValue(row.fLimit, 2),
    biomassBase: toFixedValue(row.biomassBase),
    fMax: toFixedValue(row.fMax, 2),
  };
};

const createDefaultRow = (
  id: string,
  label: string,
  biomassBase: number,
  fMax: number,
): SpeciesInputRow => {
  const fStart = 0;
  const biomassLimit = toFixedValue(Math.max(0.1, biomassBase * 0.45));
  const fLimit = toFixedValue(fStart + (fMax - fStart) * 0.55, 2);

  return {
    id,
    label,
    biomassLimit,
    fStart,
    fLimit,
    biomassBase,
    fMax,
  };
};

const defaultRows: SpeciesInputRow[] = [
  createDefaultRow("cod", "Cod", 4.024, 0.196),
  createDefaultRow("whiting", "Whiting", 2.207, 0.0765),
  createDefaultRow("mackerel", "Mackerel", 1.516, 0.205),
  createDefaultRow("anchovy", "Anchovy", 8.258, 0.141),
  createDefaultRow("shrimp", "Shrimp", 0.884, 0.0914),
];

const MotionDiv = motion.div;

const AnchovyInputsFlow = ({
  isOpen,
  onClose,
  onComplete,
}: AnchovyInputsFlowProps) => {
  const [rows, setRows] = useState(defaultRows);
  const [activeSpeciesId, setActiveSpeciesId] = useState(defaultRows[0].id);
  const [stepIndex, setStepIndex] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [selectedYears, setSelectedYears] = useState<number | null>(null);
  const [selectedIpccScenario, setSelectedIpccScenario] = useState<
    string | null
  >(null);
  const [isDraggingHandle, setIsDraggingHandle] = useState(false);
  const [expandedXMax, setExpandedXMax] = useState<number | null>(null);
  const dragDraftRef = useRef<SpeciesInputRow | null>(null);

  const steps = [
    {
      key: "inputs",
      title: "Anchovy Bay · Harvest control inputs",
      subtitle:
        "Pick a species, drag the three control points in the graph, and the biomass and fishing-mortality values update instantly.",
    },
    {
      key: "years",
      title: "Select Duration Of Model Run",
      subtitle:
        "Choose a run duration. For 10 years or less, the modal closes immediately.",
    },
    {
      key: "ipcc",
      title: "Select IPCC Scenario",
      subtitle:
        "Choose one climate scenario for long-horizon runs (> 10 years).",
    },
  ] as const;

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

  const activeRow = rows.find((row) => row.id === activeSpeciesId) ?? rows[0];

  const xMax = expandedXMax ?? activeRow.biomassBase;

  const graphPoints = useMemo(
    () => [
      { x: 0, y: 0 },
      { x: 0, y: activeRow.fStart },
      { x: activeRow.biomassLimit, y: activeRow.fLimit },
      { x: activeRow.biomassBase, y: activeRow.fMax },
    ],
    [
      activeRow.biomassBase,
      activeRow.biomassLimit,
      activeRow.fLimit,
      activeRow.fMax,
      activeRow.fStart,
    ],
  );

  const updateActiveRowStartPoint = (yValue: number) => {
    setRows((current) =>
      current.map((row) => {
        if (row.id !== activeSpeciesId) {
          return row;
        }

        return persistRowPrecision(clampStartPoint(row, yValue));
      }),
    );
  };

  const updateActiveRowMiddlePoint = (xValue: number, yValue: number) => {
    setRows((current) =>
      current.map((row) => {
        if (row.id !== activeSpeciesId) {
          return row;
        }

        return persistRowPrecision(clampMiddlePoint(row, xValue, yValue));
      }),
    );
  };

  const updateActiveRowEndPoint = (xValue: number, yValue: number) => {
    setRows((current) =>
      current.map((row) => {
        if (row.id !== activeSpeciesId) {
          return row;
        }

        return persistRowPrecision(clampEndPoint(row, xValue, yValue, xMax));
      }),
    );
  };

  const chartOptions: ChartOptions<"line"> = {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 240,
    },
    interaction: {
      mode: "nearest",
      intersect: true,
    },
    onHover: (
      _event: ChartEvent,
      activeElements: ActiveElement[],
      chart,
    ) => {
      const isHandleHovered = activeElements.some(
        (element) =>
          element.index === 1 || element.index === 2 || element.index === 3,
      );

      chart.canvas.style.cursor = isDraggingHandle
        ? "grabbing"
        : isHandleHovered
          ? "grab"
          : "default";
    },
    scales: {
      x: {
        type: "linear",
        min: 0,
        max: xMax,
        ticks: {
          color: "rgba(233, 244, 255, 0.88)",
          callback: (value) => formatDisplayValue(Number(value)),
        },
        grid: {
          color: "rgba(218, 234, 250, 0.12)",
        },
        title: {
          display: true,
          text: "Biomass",
          color: "rgba(240, 248, 255, 0.92)",
          font: { size: 14, weight: 600 },
        },
      },
      y: {
        min: 0,
        max: 1,
        ticks: {
          color: "rgba(233, 244, 255, 0.88)",
          callback: (value) => formatDisplayValue(Number(value)),
        },
        grid: {
          color: "rgba(218, 234, 250, 0.12)",
        },
        title: {
          display: true,
          text: "Fishing mortality (catch/biomass)",
          color: "rgba(240, 248, 255, 0.92)",
          font: { size: 14, weight: 600 },
        },
      },
    },
    plugins: {
      legend: {
        labels: {
          color: "rgba(241, 248, 255, 0.95)",
        },
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const point = context.raw as { x: number; y: number };
            const pointLabels = [
              "Origin",
              "Start control",
              "Middle control",
              "End control",
            ];
            const pointLabel = pointLabels[context.dataIndex] ?? "Control";

            return `${pointLabel}: x=${formatDisplayValue(point.x)}, y=${formatDisplayValue(point.y)}`;
          },
        },
      },
    },
  };

  // `dragData` is provided by `chartjs-plugin-dragdata`.
  (
    chartOptions.plugins as NonNullable<ChartOptions<"line">["plugins"]> & {
      dragData?: Record<string, unknown>;
    }
  ).dragData = {
    dragX: true,
    dragY: true,
    showTooltip: true,
    round: 2,
    onDragStart: (
      _event: unknown,
      _datasetIndex: number,
      pointIndex: number,
    ) => {
      const isDraggablePoint =
        pointIndex === 1 || pointIndex === 2 || pointIndex === 3;

      if (pointIndex === 3) {
        setExpandedXMax(Math.max(activeRow.biomassBase + 1, activeRow.biomassBase * 1.25));
      } else {
        setExpandedXMax(null);
      }

      dragDraftRef.current = isDraggablePoint ? { ...activeRow } : null;
      setIsDraggingHandle(isDraggablePoint);
      return isDraggablePoint;
    },
    onDrag: (
      _event: unknown,
      _datasetIndex: number,
      pointIndex: number,
      value: unknown,
    ) => {
      if (pointIndex !== 1 && pointIndex !== 2 && pointIndex !== 3) {
        return false;
      }

      const point = value as { x: number; y: number };
      const draftRow = dragDraftRef.current ?? { ...activeRow };

      if (pointIndex === 1) {
        point.x = 0;
        const nextRow = clampStartPoint(draftRow, point.y);
        point.y = nextRow.fStart;
        dragDraftRef.current = nextRow;
        return true;
      }

      if (pointIndex === 2) {
        const nextRow = clampMiddlePoint(draftRow, point.x, point.y);
        point.x = nextRow.biomassLimit;
        point.y = nextRow.fLimit;
        dragDraftRef.current = nextRow;
        return true;
      }

      const nextRow = clampEndPoint(draftRow, point.x, point.y, xMax);

      if (point.x >= xMax * 0.98) {
        setExpandedXMax(Math.max(xMax + 1, xMax * 1.25));
      }

      point.x = nextRow.biomassBase;
      point.y = nextRow.fMax;
      dragDraftRef.current = nextRow;
      return true;
    },
    onDragEnd: (_event: unknown, _datasetIndex: number, pointIndex: number) => {
      setIsDraggingHandle(false);
      setExpandedXMax(null);
      const draftRow = dragDraftRef.current;

      if (!draftRow) {
        return;
      }

      if (pointIndex === 1) {
        updateActiveRowStartPoint(draftRow.fStart);
      } else if (pointIndex === 2) {
        updateActiveRowMiddlePoint(draftRow.biomassLimit, draftRow.fLimit);
      } else if (pointIndex === 3) {
        updateActiveRowEndPoint(draftRow.biomassBase, draftRow.fMax);
      }

      dragDraftRef.current = null;
    },
  };

  const chartData = {
    datasets: [
      {
        label: activeRow.label,
        data: graphPoints,
        parsing: false as const,
        borderColor: "#E84D48",
        backgroundColor: "#E84D48",
        borderWidth: 3,
        clip: false as const,
        pointRadius: [0, 8, 8, 8],
        pointHoverRadius: [0, 9, 9, 9],
        pointHitRadius: [0, 20, 20, 20],
        pointBackgroundColor: ["transparent", "#7ad6ff", "#ffc66a", "#f6fbff"],
        pointBorderColor: "#E84D48",
        pointBorderWidth: [0, 3, 3, 3],
        tension: 0,
        segment: {
          borderColor: (context: ScriptableLineSegmentContext) =>
            context.p0DataIndex === 0 && context.p1DataIndex === 1
              ? "transparent"
              : "#E84D48",
        },
      },
    ],
  };

  const selectData = rows.map((row) => ({
    value: row.id,
    label: row.label,
  }));

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
        size="min(1180px, 96vw)"
        zIndex={6000}
        withinPortal={false}
        withOverlay
        overlayOpacity={0.72}
        overlayBlur={8}
        closeOnClickOutside={false}
      >
        <Stack gap="md" className={styles.flowRoot}>
          <div className={styles.flowHeading}>
            <Group
              justify="space-between"
              align="center"
              gap="sm"
              className={styles.headingRow}
            >
              <Title order={2} className={styles.flowTitle}>
                {steps[stepIndex].title}
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
                        setExpandedXMax(null);
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
              {steps[stepIndex].subtitle}
            </Text>
          </div>

          <div className={styles.stepViewport}>
            <AnimatePresence mode="wait" custom={direction}>
              {stepIndex === 0 ? (
                <MotionDiv
                  key="anchovy-input-step-1"
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
                      <Paper className={styles.chartPanel} withBorder>
                        <div className={styles.chartSurface}>
                          <Line options={chartOptions} data={chartData} />
                        </div>
                      </Paper>

                      <Paper className={styles.tablePanel} withBorder>
                        <ScrollArea
                          className={styles.tableScrollArea}
                          type="auto"
                          offsetScrollbars
                          scrollbarSize={8}
                          classNames={{ thumb: "thumb" }}
                        >
                          <Table
                            highlightOnHover
                            withTableBorder
                            withColumnBorders
                          >
                            <Table.Thead>
                              <Table.Tr>
                                <Table.Th>Group name</Table.Th>
                                <Table.Th>F start</Table.Th>
                                <Table.Th>Biomass limit</Table.Th>
                                <Table.Th>F limit</Table.Th>
                                <Table.Th>Biomass base</Table.Th>
                                <Table.Th>F max</Table.Th>
                              </Table.Tr>
                            </Table.Thead>
                            <Table.Tbody>
                              {rows.map((row) => (
                                <Table.Tr
                                  key={row.id}
                                  className={
                                    row.id === activeSpeciesId
                                      ? styles.activeRow
                                      : undefined
                                  }
                                >
                                  <Table.Td>{row.label}</Table.Td>
                                  <Table.Td>{formatDisplayValue(row.fStart)}</Table.Td>
                                  <Table.Td>
                                    {row.biomassLimit.toFixed(3)}
                                  </Table.Td>
                                  <Table.Td>{formatDisplayValue(row.fLimit)}</Table.Td>
                                  <Table.Td>{row.biomassBase.toFixed(3)}</Table.Td>
                                  <Table.Td>{formatDisplayValue(row.fMax)}</Table.Td>
                                </Table.Tr>
                              ))}
                            </Table.Tbody>
                          </Table>
                        </ScrollArea>
                      </Paper>
                    </div>
                  </ScrollArea>
                </MotionDiv>
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
                        <div className={styles.selectionCards}>
                          <SelectableCards
                            options={YEAR_OPTIONS}
                            selectedValue={selectedYears?.toString() ?? null}
                            onSelect={handleYearSelect}
                            columns={2}
                          />
                        </div>
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
                  <ScrollArea
                    className={styles.stepScrollArea}
                    type="auto"
                    offsetScrollbars
                    scrollbarSize={8}
                    classNames={{ thumb: "thumb" }}
                  >
                    <div className={styles.stepContent}>
                      <Paper className={styles.finalPanel} withBorder>
                        <Text className={styles.reviewTitle}>IPCC scenarios</Text>
                        <Text className={styles.finalText}>
                          Selected duration: {selectedYears} years.
                        </Text>
                        <div className={styles.selectionCards}>
                          <SelectableCards
                            options={IPCC_OPTIONS}
                            selectedValue={selectedIpccScenario}
                            onSelect={handleIpccSelect}
                            columns={1}
                          />
                        </div>
                      </Paper>
                    </div>
                  </ScrollArea>
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
