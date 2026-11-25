import { FiCheck } from "react-icons/fi";
import { Radio } from "../RadioGroup/RadioGroup";
import styles from "./YearlyDurationCard.module.css";

type Props = { years: number; isDisabled?: boolean; description?: string; unavailableReason?: string };

export default function YearlyDurationCard({ years, isDisabled = false, description, unavailableReason }: Props) {
  return <Radio value={String(years)} isDisabled={isDisabled} className={styles.card}>
    <span className={styles.indicator} aria-hidden="true"><FiCheck /></span>
    <span className={styles.title}><span className={styles.number}>{years}</span><span className={styles.unit}>years</span></span>
    {description ? <span className={styles.description}>{description}</span> : null}
    {unavailableReason ? <span className={styles.description}>{unavailableReason}</span> : null}
  </Radio>;
}
