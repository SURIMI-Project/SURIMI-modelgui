import styles from "./MapLegend.module.css";

type MapLegendProps = {
  metricLabel: string;
  min: number;
  max: number;
  formatValue?: (value: number) => string;
};

const MapLegend = ({ metricLabel, min, max, formatValue = value => value.toFixed(2) }: MapLegendProps) => {
  return (
    <div className={styles.legend}>
      <div className={styles.headerRow}>
        <span>{metricLabel} intensity</span>
        <span>Low to High</span>
      </div>
      <div className={styles.gradientBar} aria-hidden="true" />
      <div className={styles.valueRow}>
        <span>{formatValue(min)}</span>
        <span>{formatValue(max)}</span>
      </div>
    </div>
  );
};

export default MapLegend;
