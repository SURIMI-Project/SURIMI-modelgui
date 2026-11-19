import { FiAnchor } from "react-icons/fi";
import { simulationCaseStudies, type SimulationCaseId } from "../../../data/simulationCases";
import styles from "./MarineCaseIdentity.module.css";

type Props = { caseId: SimulationCaseId; disabled?: boolean; onSelect: () => void };
export default function MarineCaseIdentity({ caseId, disabled, onSelect }: Props) {
  const identity = simulationCaseStudies.find(item => item.id === caseId)!;
  const image = caseId === "aegean-sea" ? "anchovy" : "sardine";
  return (
    <button type="button" className={styles.card} data-case-study={caseId} disabled={disabled} aria-haspopup="dialog" onClick={onSelect}>
      <span className={styles.heading} style={{ backgroundImage: `linear-gradient(90deg, var(--color-map-card-surface), var(--color-map-card-image-overlay)), url(/images/marine-species/${image}.webp)` }}>
        <FiAnchor aria-hidden="true" /><strong>{identity.seaName}</strong>
      </span>
      <span className={styles.coverage}>{identity.subtitle}</span>
    </button>
  );
}
