import { ScrollArea, Table, type TableData } from "@mantine/core";
import styles from "./AnchovyInputsFlow.module.css";
import type { SpeciesInputRow } from "./types";

type AnchovyInputsTableProps = {
  tableData: SpeciesInputRow[];
  activeSpeciesId: string;
  onSelectRow: (id: string) => void;
};

const formatFishingMortalityValue = (value: number) =>
  value.toFixed(4).replace(/\.?0+$/, "");

const AnchovyInputsTable = ({
  tableData,
  activeSpeciesId,
  onSelectRow,
}: AnchovyInputsTableProps) => {
  const data: TableData = {
    head: ["Group name", "F min", "Biomass limit", "Biomass base", "F max"],
    body: tableData.map((row) => {
      const cellClassName = [
        styles.tableCellContent,
        row.id === activeSpeciesId ? styles.activeCellContent : "",
      ]
        .filter(Boolean)
        .join(" ");

      const createCell = (content: string, suffix: string) => (
        <button
          key={`${row.id}-${suffix}`}
          type="button"
          className={cellClassName}
          onClick={() => {
            onSelectRow(row.id);
          }}
        >
          {content}
        </button>
      );

      return [
        createCell(row.label, "label"),
        createCell(formatFishingMortalityValue(row.fMin), "f-min"),
        createCell(row.biomassLimit.toFixed(3), "biomass-limit"),
        createCell(row.biomassBase.toFixed(3), "biomass-base"),
        createCell(formatFishingMortalityValue(row.fMax), "f-max"),
      ];
    }),
  };

  return (
    <ScrollArea
      className={styles.tableScrollArea}
      type="auto"
      offsetScrollbars
      scrollbarSize={8}
      classNames={{ thumb: "thumb" }}
    >
      <Table
        data={data}
        withTableBorder
        withColumnBorders
        layout="fixed"
        className={styles.inputsTable}
      />
    </ScrollArea>
  );
};

export default AnchovyInputsTable;
