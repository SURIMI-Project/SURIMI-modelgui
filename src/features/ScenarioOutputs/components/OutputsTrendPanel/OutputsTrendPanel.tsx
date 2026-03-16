import OutputsTrendChart from "../Charts/OutputsTrendChart";
import styles from "./OutputsTrendPanel.module.css";

type OutputsTrendPanelProps = {
  title: string;
  subtitle: string;
  metricLabel: string;
  currentValue: number;
  currentValueLabel: string;
  labels: string[];
  values: number[];
  selectedIndex: number;
  lineColor: string;
  onSelectIndex: (index: number) => void;
  className?: string;
  compact?: boolean;
};

const OutputsTrendPanel = ({
  title,
  subtitle,
  metricLabel,
  currentValue,
  currentValueLabel,
  labels,
  values,
  selectedIndex,
  lineColor,
  onSelectIndex,
  className,
  compact = false,
}: OutputsTrendPanelProps) => {
  return (
    <section
      className={[
        styles.panel,
        compact ? styles.panelCompact : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className={styles.header}>
        <div>
          <p className={styles.kicker}>{title}</p>
          <h3 className={styles.title}>{subtitle}</h3>
        </div>
        <div className={styles.valueBlock}>
          <span>{metricLabel}</span>
          <strong>{currentValueLabel}</strong>
        </div>
      </div>

      <div className={styles.chartWrap}>
        <OutputsTrendChart
          labels={labels}
          values={values}
          metricLabel={metricLabel}
          lineColor={lineColor}
          selectedIndex={selectedIndex}
          onSelectIndex={onSelectIndex}
          compact={compact}
        />
      </div>

      {!compact ? (
        <p className={styles.selectionCopy}>
          Selected year value: {currentValue.toFixed(2)}
        </p>
      ) : null}
    </section>
  );
};

export default OutputsTrendPanel;
