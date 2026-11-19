import {
  Popover as AriaPopover,
  composeRenderProps,
  type PopoverProps,
} from "react-aria-components";
import styles from "../../../styles/aria/popover/Popover.module.css";
export default function Popover({ className, ...props }: PopoverProps) {
  return (
    <AriaPopover
      {...props}
      className={composeRenderProps(
        className,
        (value) => `${styles.popover} ${value ?? ""}`,
      )}
    />
  );
}
