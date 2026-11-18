import type { ReactNode } from "react";
import { Focusable, OverlayArrow, Tooltip as AriaTooltip, composeRenderProps, type TooltipProps } from "react-aria-components";
import styles from "./Tooltip.module.css";
export { TooltipTrigger } from "react-aria-components";

export default function Tooltip({ children, className, ...props }: Omit<TooltipProps, "children"> & { children: ReactNode }) {
  return <AriaTooltip placement="top" offset={10} {...props} className={composeRenderProps(className, value => `${styles.tooltip} ${value ?? ""}`)}>
    <OverlayArrow className={styles.arrow}><svg width="16" height="8" viewBox="0 0 16 8" aria-hidden="true"><path d="M0 0L8 8L16 0Z" /></svg></OverlayArrow>
    {children}
  </AriaTooltip>;
}

// Native disabled buttons do not receive hover/focus. This wrapper provides
// an accessible tooltip target without enabling the action itself.
export function DisabledTooltipTarget({ children, label, isDisabled = true }: { children: ReactNode; label: string; isDisabled?: boolean }) {
  return <Focusable><span tabIndex={isDisabled ? 0 : -1} role={isDisabled ? "group" : undefined} aria-label={isDisabled ? label : undefined} data-disabled={isDisabled || undefined} className={styles.disabledTarget}>{children}</span></Focusable>;
}
