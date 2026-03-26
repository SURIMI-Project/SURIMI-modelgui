import { SegmentedControl } from "@mantine/core";
import type { ScenarioOutputMetric } from "../../types";
import styles from "./MetricsSelector.module.css";

type MetricsSelectorProps = {
  value: ScenarioOutputMetric;
  onChange: (value: ScenarioOutputMetric) => void;
};

const MetricsSelector = ({ value, onChange }: MetricsSelectorProps) => {
  return (
    <div className={styles.container}>
      <label className={styles.label} htmlFor="metrics-selector">
        Metric
      </label>
      <SegmentedControl
        id="metrics-selector"
        value={value}
        onChange={(next) => {
          onChange(next as ScenarioOutputMetric);
        }}
        data={[
          { label: "Biomass", value: "biomass" },
          { label: "Landings & Discards", value: "landings" },
        ]}
        className={styles.segmented}
      />
    </div>
  );
};

export default MetricsSelector;
