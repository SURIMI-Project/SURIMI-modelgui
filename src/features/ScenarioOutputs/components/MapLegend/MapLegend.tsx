import styles from "./MapLegend.module.css";

type MapLegendProps = {
  metricLabel: string;
  min: number;
  max: number;
};

const MapLegend = ({ metricLabel, min, max }: MapLegendProps) => {
  return (
    <div className={styles.legend}>
      <div className={styles.headerRow}>
        <span>{metricLabel} intensity</span>
        <span>Low to High</span>
      </div>
      <div className={styles.gradientBar} aria-hidden="true" />
      <div className={styles.valueRow}>
        <span>{min.toFixed(2)}</span>
        <span>{max.toFixed(2)}</span>
      </div>
    </div>
  );
};

export default MapLegend;
