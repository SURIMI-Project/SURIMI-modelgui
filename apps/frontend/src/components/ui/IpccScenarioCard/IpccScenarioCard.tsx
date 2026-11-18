import { FiCheck } from "react-icons/fi";
import { Radio } from "../RadioGroup/RadioGroup";
import styles from "./IpccScenarioCard.module.css";

type Props = { value: string; title: string; category: string; description: string };
export default function IpccScenarioCard({ value, title, category, description }: Props) {
  return <Radio value={value} className={styles.card}>
    <span className={styles.category}>{category}</span>
    <span className={styles.heading}><strong>{title}</strong><span className={styles.check} aria-hidden="true"><FiCheck /></span></span>
    <span className={styles.description}>{description}</span>
  </Radio>;
}
