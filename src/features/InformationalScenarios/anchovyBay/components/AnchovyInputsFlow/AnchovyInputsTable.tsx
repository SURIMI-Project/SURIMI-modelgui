import { ScrollArea, Table } from "@mantine/core";
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
  return (
    <ScrollArea
      className={styles.tableScrollArea}
      type="auto"
      offsetScrollbars
      scrollbarSize={8}
      classNames={{ thumb: "thumb" }}
    >
      <Table highlightOnHover withTableBorder withColumnBorders>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Group name</Table.Th>
            <Table.Th>F min</Table.Th>
            <Table.Th>Biomass limit</Table.Th>
            <Table.Th>Biomass base</Table.Th>
            <Table.Th>F max</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {tableData.map((row) => (
            <Table.Tr
              key={row.id}
              className={
                row.id === activeSpeciesId ? styles.activeRow : undefined
              }
              onClick={() => {
                onSelectRow(row.id);
              }}
            >
              <Table.Td>{row.label}</Table.Td>
              <Table.Td>{formatFishingMortalityValue(row.fMin)}</Table.Td>
              <Table.Td>{row.biomassLimit.toFixed(3)}</Table.Td>
              <Table.Td>{row.biomassBase.toFixed(3)}</Table.Td>
              <Table.Td>{formatFishingMortalityValue(row.fMax)}</Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </ScrollArea>
  );
};

export default AnchovyInputsTable;
