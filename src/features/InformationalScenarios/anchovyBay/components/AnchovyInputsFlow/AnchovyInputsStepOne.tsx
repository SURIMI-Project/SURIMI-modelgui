import { Paper, ScrollArea } from "@mantine/core";
import { motion } from "framer-motion";
import { useMemo, useRef, useState } from "react";
import AnchovyInputGraph from "./AnchovyInputGraph";
import AnchovyInputsTable from "./AnchovyInputsTable";
import { DEFAULT_SPECIES_INPUTS } from "./const";
import styles from "./AnchovyInputsFlow.module.css";
import type { GraphPoint, SpeciesInputRow } from "./types";

type AnchovyInputsStepOneProps = {
  direction: 1 | -1;
  activeSpeciesId: string;
  onChangeActiveSpecies: (id: string) => void;
};

const MIN_F_GAP = 0.01;
const MIN_BIOMASS_GAP = 0.1;
const MotionDiv = motion.div;

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

const toFixedValue = (value: number, digits = 3) =>
  Number(value.toFixed(digits));

const clampLeftPoint = (
  row: SpeciesInputRow,
  xValue: number,
  yValue: number,
) => {
  return {
    ...row,
    biomassLimit: clamp(
      xValue,
      MIN_BIOMASS_GAP,
      Math.max(MIN_BIOMASS_GAP, row.biomassBase - MIN_BIOMASS_GAP),
    ),
    fMin: clamp(yValue, 0, Math.max(0, row.fMax - MIN_F_GAP)),
  };
};

const clampRightPoint = (
  row: SpeciesInputRow,
  xValue: number,
  yValue: number,
) => {
  return {
    ...row,
    biomassBase: clamp(
      xValue,
      row.biomassLimit + MIN_BIOMASS_GAP,
      row.biomassBaseMax,
    ),
    fMax: clamp(yValue, row.fMin + MIN_F_GAP, 1),
  };
};

const persistRowPrecision = (row: SpeciesInputRow): SpeciesInputRow => {
  return {
    ...row,
    biomassLimit: toFixedValue(row.biomassLimit),
    fMin: toFixedValue(row.fMin, 4),
    biomassBase: toFixedValue(row.biomassBase),
    fMax: toFixedValue(row.fMax, 4),
    biomassBaseMax: toFixedValue(row.biomassBaseMax),
  };
};

const createPresetRow = ({
  ID,
  LABEL,
  BIOMASS_LIMIT,
  BIOMASS_BASE,
  F_MAX,
}: (typeof DEFAULT_SPECIES_INPUTS)[number]): SpeciesInputRow => {
  return {
    id: ID,
    label: LABEL,
    biomassLimit: toFixedValue(BIOMASS_LIMIT),
    fMin: 0,
    biomassBase: toFixedValue(BIOMASS_BASE),
    fMax: toFixedValue(F_MAX, 4),
    biomassBaseMax: toFixedValue(BIOMASS_BASE + 2),
  };
};

const defaultRows: SpeciesInputRow[] = DEFAULT_SPECIES_INPUTS.map(createPresetRow);

const AnchovyInputsStepOne = ({
  direction,
  activeSpeciesId,
  onChangeActiveSpecies,
}: AnchovyInputsStepOneProps) => {
  const [rows, setRows] = useState(defaultRows);
  const [isDraggingHandle, setIsDraggingHandle] = useState(false);
  const dragDraftRef = useRef<SpeciesInputRow | null>(null);

  const activeRow = rows.find((row) => row.id === activeSpeciesId) ?? rows[0];
  const xMax = activeRow.biomassBaseMax;

  const graphPoints = useMemo<GraphPoint[]>(
    () => [
      { x: 0, y: 0 },
      { x: activeRow.biomassLimit, y: activeRow.fMin },
      { x: activeRow.biomassBase, y: activeRow.fMax },
      { x: activeRow.biomassBaseMax, y: activeRow.fMax },
    ],
    [
      activeRow.biomassBase,
      activeRow.biomassBaseMax,
      activeRow.biomassLimit,
      activeRow.fMax,
      activeRow.fMin,
    ],
  );

  const updateActiveRowLeftPoint = (xValue: number, yValue: number) => {
    setRows((current) =>
      current.map((row) => {
        if (row.id !== activeSpeciesId) {
          return row;
        }

        return persistRowPrecision(clampLeftPoint(row, xValue, yValue));
      }),
    );
  };

  const updateActiveRowRightPoint = (xValue: number, yValue: number) => {
    setRows((current) =>
      current.map((row) => {
        if (row.id !== activeSpeciesId) {
          return row;
        }

        return persistRowPrecision(clampRightPoint(row, xValue, yValue));
      }),
    );
  };

  const handleDragStart = (pointIndex: number) => {
    const isDraggablePoint = pointIndex === 1 || pointIndex === 2;

    dragDraftRef.current = isDraggablePoint ? { ...activeRow } : null;
    setIsDraggingHandle(isDraggablePoint);
    return isDraggablePoint;
  };

  const handleDrag = (pointIndex: number, point: GraphPoint) => {
    if (pointIndex !== 1 && pointIndex !== 2) {
      return null;
    }

    const draftRow = dragDraftRef.current ?? { ...activeRow };

    if (pointIndex === 1) {
      const nextRow = clampLeftPoint(draftRow, point.x, point.y);
      dragDraftRef.current = nextRow;
      return {
        x: nextRow.biomassLimit,
        y: nextRow.fMin,
      };
    }

    const nextRow = clampRightPoint(draftRow, point.x, point.y);
    dragDraftRef.current = nextRow;
    return {
      x: nextRow.biomassBase,
      y: nextRow.fMax,
    };
  };

  const handleDragEnd = (pointIndex: number) => {
    setIsDraggingHandle(false);
    const draftRow = dragDraftRef.current;

    if (!draftRow) {
      return;
    }

    if (pointIndex === 1) {
      updateActiveRowLeftPoint(draftRow.biomassLimit, draftRow.fMin);
    } else if (pointIndex === 2) {
      updateActiveRowRightPoint(draftRow.biomassBase, draftRow.fMax);
    }

    dragDraftRef.current = null;
  };

  return (
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
              <AnchovyInputGraph
                activeRow={activeRow}
                graphPoints={graphPoints}
                xMax={xMax}
                isDraggingHandle={isDraggingHandle}
                onDragStart={handleDragStart}
                onDrag={handleDrag}
                onDragEnd={handleDragEnd}
              />
            </div>
          </Paper>

          <Paper className={styles.tablePanel} withBorder>
            <AnchovyInputsTable
              tableData={rows}
              activeSpeciesId={activeSpeciesId}
              onSelectRow={onChangeActiveSpecies}
            />
          </Paper>
        </div>
      </ScrollArea>
    </MotionDiv>
  );
};

export default AnchovyInputsStepOne;
