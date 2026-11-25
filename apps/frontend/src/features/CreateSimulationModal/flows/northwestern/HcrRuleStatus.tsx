import { FiX } from "react-icons/fi";
import Button from "../../../../components/ui/Button/Button";
import styles from "./HcrRuleStatus.module.css";

type Props = {
  status: "modified" | "default" | "saved";
  speciesLabel: string;
  onReset: () => void;
};

export default function HcrRuleStatus({ status, speciesLabel, onReset }: Props) {
  if (status !== "modified") return <span className={styles.status} data-status={status}>
    {status === "saved" ? "Saved values" : "Default values"}
  </span>;

  return <Button className={styles.status} data-status={status} variant="ghost" size="sm"
    aria-label={`Restore defaults for ${speciesLabel}`} onPress={onReset}>
    Modified <FiX aria-hidden="true" />
  </Button>;
}
