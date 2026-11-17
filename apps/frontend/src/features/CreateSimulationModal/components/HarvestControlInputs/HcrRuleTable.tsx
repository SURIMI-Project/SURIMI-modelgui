import type { ReactNode } from "react";
import { FiX } from "react-icons/fi";
import Table, { TableHeader, Column, TableBody, Row, Cell } from "../../../../components/ui/Table/Table";
import Button from "../../../../components/ui/Button/Button";
import type { HcrRuleTableRow } from "./types";
import styles from "./HcrRuleTable.module.css";

export type HcrValueColumn = "biomass_limit_kg" | "biomass_base_kg" | "f_max";
type Props = {
  rows: readonly HcrRuleTableRow[];
  selectedKey: string | null;
  onSelect: (key: string) => void;
  renderEditor?: (row: HcrRuleTableRow, column: HcrValueColumn) => ReactNode;
  onRemove?: (key: string) => void;
};
const format = (value: number | undefined) => value !== undefined && Number.isFinite(value)
  ? value.toLocaleString("en", { maximumSignificantDigits: 8 }) : "—";

export default function HcrRuleTable({ rows, selectedKey, onSelect, renderEditor, onRemove }: Props) {
  const value = (row: HcrRuleTableRow, column: HcrValueColumn) =>
    renderEditor?.(row, column) ?? <span title={format(row.rule?.[column])}>{format(row.rule?.[column])}</span>;
  return <Table className={styles.table} aria-label="Harvest control rules by species and life stage" selectionMode="single" selectionBehavior="replace"
    selectedKeys={new Set(selectedKey ? [selectedKey] : [])} onSelectionChange={keys => {
      if (keys === "all") return;
      const key = keys.values().next().value;
      if (key !== undefined) onSelect(String(key));
    }}>
    <TableHeader>
      <Column isRowHeader>Species / life stage</Column><Column>Biomass limit (kg)</Column>
      <Column>F min</Column><Column>Biomass base (kg)</Column><Column>F max</Column><Column aria-label="Rule actions"><span className={styles.srOnly}>Actions</span></Column>
    </TableHeader>
    <TableBody items={rows} dependencies={[selectedKey, renderEditor, onRemove]} renderEmptyState={() => "No rules in this configuration."}>
      {row => <Row id={row.key}>
        <Cell><span className={styles.species}>{row.label}</span>{!row.eligible ? <small>No longer eligible</small> : !row.rule ? <small>Not configured</small> : null}</Cell>
        <Cell>{value(row, "biomass_limit_kg")}</Cell><Cell>{row.rule ? "0" : "—"}</Cell>
        <Cell>{value(row, "biomass_base_kg")}</Cell><Cell>{value(row, "f_max")}</Cell>
        <Cell>{onRemove && row.rule ? <Button size="sm" variant="ghost" iconOnly aria-label={`Remove rule for ${row.label}`} onPress={() => onRemove(row.key)}><FiX aria-hidden="true" /></Button> : null}</Cell>
      </Row>}
    </TableBody>
  </Table>;
}
