import type { HeatPoint } from "../../types";
import HeatMap from "../HeatMap/HeatMap";
import MapLegend from "../MapLegend/MapLegend";
import styles from "./OutputsMapPanel.module.css";

type OutputsMapPanelProps = {
  title: string;
  subtitle: string;
  kicker?: string;
  speciesCode: string;
  year: number;
  points: HeatPoint[];
  metricLabel: string;
  bounds: [number, number, number, number];
  valueDomain: {
    min: number;
    max: number;
  };
  className?: string;
  mapClassName?: string;
  compact?: boolean;
};

const OutputsMapPanel = ({
  title,
  subtitle,
  kicker,
  speciesCode,
  year,
  points,
  metricLabel,
  bounds,
  valueDomain,
  className,
  mapClassName,
  compact = false,
}: OutputsMapPanelProps) => {
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
      {!compact ? (
        <div className={styles.header}>
          <div className={styles.headerCopy}>
            <p className={styles.kicker}>{kicker ?? `${speciesCode} · ${year}`}</p>
            {title ? <h2 className={styles.title}>{title}</h2> : null}
            {subtitle ? <p className={styles.subtitle}>{subtitle}</p> : null}
          </div>

          <MapLegend
            metricLabel={metricLabel}
            min={valueDomain.min}
            max={valueDomain.max}
          />
        </div>
      ) : null}

      <HeatMap
        className={mapClassName}
        points={points}
        metricLabel={metricLabel}
        bounds={bounds}
        valueDomain={valueDomain}
      />
    </section>
  );
};

export default OutputsMapPanel;
