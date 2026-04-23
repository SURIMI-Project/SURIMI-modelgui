import type { ReactNode } from "react";
import OutputsTrendChart, {
  type OutputsTrendChartSeries,
} from "../Charts/OutputsTrendChart";
import styles from "./OutputsTrendPanel.module.css";

type OutputsTrendPanelProps = {
  title: string;
  subtitle: string;
  metricLabel: string;
  currentValue: number;
  currentValueLabel: string;
  selectionCopy?: string;
  labels?: string[];
  values?: number[];
  historicalLabels?: string[];
  historicalValues?: number[];
  simulatedHistoricalValues?: number[];
  futureLabels?: string[];
  futureValues?: number[];
  series?: OutputsTrendChartSeries[];
  selectedIndex: number;
  lineColor: string;
  onSelectIndex: (index: number) => void;
  headerAside?: ReactNode;
  className?: string;
  compact?: boolean;
};

const OutputsTrendPanel = ({
  title,
  subtitle,
  metricLabel,
  currentValue,
  currentValueLabel,
  selectionCopy,
  labels,
  values,
  historicalLabels,
  historicalValues,
  simulatedHistoricalValues,
  futureLabels,
  futureValues,
  series,
  selectedIndex,
  lineColor,
  onSelectIndex,
  headerAside,
  className,
  compact = false,
}: OutputsTrendPanelProps) => {
  return (
    <section
      className={[styles.panel, compact ? styles.panelCompact : "", className]
        .filter(Boolean)
        .join(" ")}
    >
      <div className={styles.header}>
        <div>
          <p className={styles.kicker}>{title}</p>
          <h3 className={styles.title}>{subtitle}</h3>
        </div>
        {headerAside ? (
          <div className={styles.headerAside}>{headerAside}</div>
        ) : (
          <div className={styles.valueBlock}>
            <span>{metricLabel}</span>
            <strong>{currentValueLabel}</strong>
          </div>
        )}
      </div>

      <div className={styles.chartWrap}>
        <OutputsTrendChart
          labels={labels}
          values={values}
          historicalLabels={historicalLabels}
          historicalValues={historicalValues}
          simulatedHistoricalValues={simulatedHistoricalValues}
          futureLabels={futureLabels}
          futureValues={futureValues}
          series={series}
          metricLabel={metricLabel}
          lineColor={lineColor}
          selectedIndex={selectedIndex}
          onSelectIndex={onSelectIndex}
          compact={compact}
        />
      </div>

      {!compact ? (
        <p className={styles.selectionCopy}>
          {selectionCopy ?? `Selected year value: ${currentValue.toFixed(2)}`}
        </p>
      ) : null}
    </section>
  );
};

export default OutputsTrendPanel;
