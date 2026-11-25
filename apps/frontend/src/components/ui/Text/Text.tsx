import { Text as AriaText, TextContext } from "react-aria-components";
import type { ComponentProps } from "react";
import styles from "./Text.module.css";

type Props = ComponentProps<typeof AriaText> & { truncate?: boolean };
// Inherit typography from the surrounding design-system component. Truncation
// affects presentation only; the full text remains in the accessible content.
export default function Text({ truncate = false, className, slot, ...props }: Props) {
  const content = <AriaText {...props} slot={slot} className={`${truncate ? styles.truncate : ""} ${className ?? ""}`} />;
  // Presentation text must not bind to a surrounding dialog's description.
  // Only explicitly named slots participate in React Aria's text context.
  return slot === undefined ? <TextContext.Provider value={{}}>{content}</TextContext.Provider> : content;
}
