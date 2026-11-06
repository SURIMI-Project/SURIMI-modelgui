import RadioGroup, {
  Radio,
} from "../../../../components/ui/RadioGroup/RadioGroup";
import type { ScenarioOutputMetric } from "../../types";
import styles from "./MetricsSelector.module.css";
type Props = {
  value: ScenarioOutputMetric;
  onChange: (value: ScenarioOutputMetric) => void;
};
export default function MetricsSelector({ value, onChange }: Props) {
  return (
    <RadioGroup
      label="Select metric"
      value={value}
      onChange={(next) => {
        if (next === "biomass" || next === "landings") onChange(next);
      }}
      className={styles.container}
    >
      <Radio value="biomass">
        <span className={styles.title}>Biomass</span>
        <span className={styles.description}>
          Track stock biomass over time.
        </span>
      </Radio>
      <Radio value="landings">
        <span className={styles.title}>Landings & Discards</span>
        <span className={styles.description}>
          Compare landings and discard pressure.
        </span>
      </Radio>
    </RadioGroup>
  );
}
