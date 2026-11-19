import { FiCheck } from "react-icons/fi";
import { Radio } from "../RadioGroup/RadioGroup";
import styles from "./YearlyDurationCard.module.css";

type Props = { years: number; isDisabled?: boolean; description?: string };

export default function YearlyDurationCard({ years, isDisabled = false, description }: Props) {
  return <Radio value={String(years)} isDisabled={isDisabled} aria-description={description} className={styles.card}>
    <span className={styles.indicator} aria-hidden="true"><FiCheck /></span>
    <span className={styles.number}>{years}</span>
    <span className={styles.unit}>years</span>
  </Radio>;
}
