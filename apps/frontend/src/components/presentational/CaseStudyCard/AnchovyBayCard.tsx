import Button from "../../ui/Button/Button";
import styles from "./AnchovyBayCard.module.css";

type Props = { onSelect: () => void; isDisabled?: boolean };
export default function AnchovyBayCard({ onSelect, isDisabled }: Props) {
  return <Button variant="ghost" className={styles.card} data-case-study="anchovy-bay"
    aria-label="Preview Anchovy Bay" aria-haspopup="dialog" isDisabled={isDisabled} onPress={onSelect}>
    <img src="/useCasesInfo/anchovy-bay-one-river.svg" alt="" className={styles.image} />
    <span className={styles.title}><strong>ANCHOVY BAY</strong><span>Educational Case Study</span></span>
  </Button>;
}
