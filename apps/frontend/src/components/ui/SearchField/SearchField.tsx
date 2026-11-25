import { SearchField as AriaSearchField, Label, Input, Button, composeRenderProps, type SearchFieldProps } from "react-aria-components";
import { FiSearch, FiX } from "react-icons/fi";
import field from "../../../styles/aria/field/Field.module.css";
import styles from "./SearchField.module.css";

type Props = Omit<SearchFieldProps, "children"> & { label: string; placeholder?: string; labelVisuallyHidden?: boolean };
export default function SearchField({ label, placeholder, labelVisuallyHidden = false, className, ...props }: Props) {
  return <AriaSearchField {...props} className={composeRenderProps(className, value => `${field.field} ${styles.root} ${value ?? ""}`)}>
    <Label className={`${field.label} ${labelVisuallyHidden ? styles.visuallyHidden : ""}`}>{label}</Label>
    <div className={`${field.control} ${styles.control}`}>
      <FiSearch className={styles.icon} aria-hidden="true" />
      <Input className={styles.input} placeholder={placeholder} />
      <Button className={styles.clear} aria-label={`Clear ${label.toLowerCase()}`}><FiX aria-hidden="true" /></Button>
    </div>
  </AriaSearchField>;
}
