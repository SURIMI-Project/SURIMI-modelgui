import type { ReactNode, RefObject } from "react";
import styles from "./NorthwesternSimulationFlow.module.css";

type Props = { children: ReactNode; headingRef?: RefObject<HTMLHeadingElement | null> };
export default function HcrIntroduction({ children, headingRef }: Props) {
  return <div className={styles.introduction}>
    <div className={styles.introductionHeader}>
      <h2 ref={headingRef} tabIndex={-1}>Harvest Control Rules</h2>
    </div>
    <div className={styles.explanation}>
      <p>A HCR describes the relationship between stock biomass (X-axis) and harvest rate (Y-axis). For a given biomass, the rule determines the proportion of the stock that can be caught. The Total Allowable Catch (TAC) is then calculated as:</p>
      <p>By modifying the HCR curve, you directly change how the TAC responds to changes in stock size. SURIMI evaluates alternative HCRs using Management Strategy Evaluation (MSE), running many simulations to identify robust management strategies.</p>
    </div>
    <div className={styles.ruleRow}>
      <div className={styles.formula}>
        <span className={styles.formulaLabel}>Total Allowable Catch</span>
        <p>TAC = Biomass × Fishing mortality</p>
      </div>
      <div className={styles.ruleControls}>{children}</div>
    </div>
  </div>;
}
