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
        Select Metric
      </label>
      <div
        id="metrics-selector"
        className={styles.metricStack}
        role="radiogroup"
        aria-label="Metric selector"
      >
        {[
          {
            title: "Biomass",
            value: "biomass" as const,
            description: "Track stock biomass over time.",
          },
          {
            title: "Landings & Discards",
            value: "landings" as const,
            description: "Compare landings and discard pressure.",
          },
        ].map((option) => {
          const isActive = option.value === value;

          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={isActive}
              className={[
                styles.metricTag,
                isActive ? styles.metricTagActive : "",
              ]
                .filter(Boolean)
                .join(" ")}
              onClick={() => {
                onChange(option.value);
              }}
            >
              <span className={styles.metricTagTitle}>{option.title}</span>
              <span className={styles.metricTagDescription}>
                {option.description}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default MetricsSelector;
