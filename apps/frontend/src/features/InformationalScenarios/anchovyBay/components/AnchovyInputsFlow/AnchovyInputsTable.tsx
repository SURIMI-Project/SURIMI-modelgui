import Table, {
  TableHeader,
  Column,
  TableBody,
  Row,
  Cell,
} from "../../../../../components/ui/Table/Table";
import type { SpeciesInputRow } from "./types";
type Props = {
  tableData: SpeciesInputRow[];
  activeSpeciesId: string;
  onSelectRow: (id: string) => void;
};
const format = (value: number) => value.toFixed(4).replace(/\.?0+$/, "");
export default function AnchovyInputsTable({
  tableData,
  activeSpeciesId,
  onSelectRow,
}: Props) {
  return (
    <Table
      aria-label="Harvest control inputs by species"
      selectionMode="single"
      selectionBehavior="replace"
      selectedKeys={new Set([activeSpeciesId])}
      onSelectionChange={(keys) => {
        if (keys !== "all") {
          const id = keys.values().next().value;
          if (id !== undefined) onSelectRow(String(id));
        }
      }}
    >
      <TableHeader>
        <Column isRowHeader>Group name</Column>
        <Column>Biomass limit</Column>
        <Column>F min</Column>
        <Column>Biomass base</Column>
        <Column>F max</Column>
      </TableHeader>
      <TableBody items={tableData}>
        {(row) => (
          <Row id={row.id}>
            <Cell>{row.label}</Cell>
            <Cell>{row.biomassLimit.toFixed(3)}</Cell>
            <Cell>{format(row.fMin)}</Cell>
            <Cell>{row.biomassBase.toFixed(3)}</Cell>
            <Cell>{format(row.fMax)}</Cell>
          </Row>
        )}
      </TableBody>
    </Table>
  );
}
