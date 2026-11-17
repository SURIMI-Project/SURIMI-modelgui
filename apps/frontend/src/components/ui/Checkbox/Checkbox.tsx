import { Checkbox as AriaCheckbox, type CheckboxProps } from "react-aria-components";
import { FiCheck, FiMinus } from "react-icons/fi";
import type { ReactNode } from "react";
import styles from "./Checkbox.module.css";

type Props = Omit<CheckboxProps, "children"> & { children?: ReactNode };
export default function Checkbox({ children, ...props }: Props) {
  return <AriaCheckbox {...props} className={styles.checkbox}>
    {({ isSelected, isIndeterminate }) => <>
      <span className={styles.indicator} aria-hidden="true">{isIndeterminate ? <FiMinus /> : isSelected ? <FiCheck /> : null}</span>
      {children}
    </>}
  </AriaCheckbox>;
}
