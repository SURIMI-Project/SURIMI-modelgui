import type { ReactNode } from "react";
import { FiRotateCcw } from "react-icons/fi";
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
  resettableKeys: ReadonlySet<string>;
  onReset?: (key: string) => void;
};
const format = (value: number | undefined) => value !== undefined && Number.isFinite(value)
  ? value.toLocaleString("en", { maximumSignificantDigits: 8 }) : "—";

export default function HcrRuleTable({ rows, selectedKey, onSelect, renderEditor, resettableKeys, onReset }: Props) {
  const displayValue = (row: HcrRuleTableRow, column: HcrValueColumn) => {
    const number = row.rule?.[column];
    return format(number === undefined ? undefined : number / (column === "f_max" ? 1 : 1000));
  };
  const value = (row: HcrRuleTableRow, column: HcrValueColumn) =>
    <div className={styles.valueSlot}>{renderEditor?.(row, column) ?? <span className={styles.readValue} title={displayValue(row, column)}>{displayValue(row, column)}</span>}</div>;
  return <Table className={styles.table} aria-label="Harvest control rules by species and life stage" selectionMode="single" selectionBehavior="replace"
    selectedKeys={new Set(selectedKey ? [selectedKey] : [])} onSelectionChange={keys => {
      if (keys === "all") return;
      const key = keys.values().next().value;
      if (key !== undefined) onSelect(String(key));
    }}>
    <TableHeader>
      <Column isRowHeader>Species / life stage</Column><Column>Biomass limit (tonnes)</Column>
      <Column>Biomass base (tonnes)</Column><Column>Fishing mortality (per year)</Column>
    </TableHeader>
    <TableBody items={rows} dependencies={[selectedKey, renderEditor, resettableKeys, onReset]} renderEmptyState={() => "No rules in this configuration."}>
      {row => <Row id={row.key}>
        <Cell><span className={styles.species}>{row.label}</span><small>{!row.eligible ? "No longer eligible" : !row.rule ? "Not configured" : " "}</small></Cell>
        <Cell>{value(row, "biomass_limit_kg")}</Cell>
        <Cell>{value(row, "biomass_base_kg")}</Cell>
        <Cell><div className={styles.valueWithReset}>{value(row, "f_max")}
          <span className={styles.resetSlot}>{onReset && resettableKeys.has(row.key) ? <Button size="sm" variant="ghost" iconOnly
            aria-label={`Reset to opening values for ${row.label}`} onPress={() => onReset(row.key)}><FiRotateCcw aria-hidden="true" /></Button> : null}</span>
        </div></Cell>
      </Row>}
    </TableBody>
  </Table>;
}
