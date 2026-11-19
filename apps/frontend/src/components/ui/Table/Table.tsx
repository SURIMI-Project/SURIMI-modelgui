import {
  Table as AriaTable,
  composeRenderProps,
  type TableProps,
} from "react-aria-components";
import styles from "../../../styles/aria/table/Table.module.css";
export {
  TableHeader,
  Column,
  TableBody,
  Row,
  Cell,
} from "react-aria-components";
export default function Table({ className, ...props }: TableProps) {
  return (
    <div className={styles.scroll}>
      <AriaTable
        {...props}
        className={composeRenderProps(
          className,
          (value) => `${styles.table} ${value ?? ""}`,
        )}
      />
    </div>
  );
}
