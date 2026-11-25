import type { ReactNode, RefObject } from "react";
import styles from "./NorthwesternSimulationFlow.module.css";

type Props = { children?: ReactNode; headingRef?: RefObject<HTMLHeadingElement | null> };
export default function HcrIntroduction({ children, headingRef }: Props) {
  return <div className={styles.introduction}>
    <div className={styles.introductionHeader}>
      <div><h2 ref={headingRef} tabIndex={-1}>Harvest control input</h2></div>
    </div>
    {children ? <div className={styles.introductionTools}>{children}</div> : null}
  </div>;
}
