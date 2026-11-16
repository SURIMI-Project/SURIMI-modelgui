import { useId } from "react";
import { simulationCaseStudies, type SimulationCaseId } from "../../../../data/simulationCases";
import styles from "./MarineCaseIdentity.module.css";

type Props = { caseId: SimulationCaseId; expanded?: boolean; disabled?: boolean; onSelect: () => void };
export default function MarineCaseIdentity({ caseId, expanded = false, disabled, onSelect }: Props) {
  const identity = simulationCaseStudies.find(item => item.id === caseId)!;
  const id = useId();
  const image = caseId === "aegean-sea" ? "anchovy" : "sardine";
  return (
    <div className={styles.card} data-expanded={expanded}>
      <button type="button" className={styles.toggle} style={{ backgroundImage: `linear-gradient(90deg, var(--color-map-card-surface), var(--color-map-card-image-overlay)), url(/images/marine-species/${image}.webp)` }} disabled={disabled} aria-expanded={expanded} aria-controls={expanded ? id : undefined} onClick={onSelect}>
        <span className={styles.heading}><strong className={styles.title}>{identity.seaName}</strong><span aria-hidden="true">{expanded ? "−" : "+"}</span></span>
        <span className={styles.content}><span className={styles.subtitle}>{identity.subtitle}</span></span>
      </button>
      <div id={id} className={styles.expansion} aria-hidden={!expanded} inert={!expanded}>
        <div className={styles.expansionInner}>
          <p className={styles.description}>{identity.description}</p>
        </div>
      </div>
    </div>
  );
}
