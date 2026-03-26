import { AnimatePresence, motion } from "framer-motion";
import { useMemo, useState } from "react";
import styles from "./FloatingSpiderDock.module.css";

type FloatingSpiderDatum = {
  label: string;
  value: number;
};

type FloatingSpiderDockProps = {
  data: FloatingSpiderDatum[];
  maxValue?: number;
};

const SVG_SIZE = 460;
const CENTER = SVG_SIZE / 2;
const OUTER_RADIUS = 124;
const LABEL_RADIUS = 138;
const GRID_LEVELS = 4;

const pointToString = (angle: number, radius: number) => {
  const x = CENTER + Math.cos(angle) * radius;
  const y = CENTER + Math.sin(angle) * radius;
  return `${x.toFixed(2)},${y.toFixed(2)}`;
};

const FloatingSpiderDock = ({
  data,
  maxValue = 100,
}: FloatingSpiderDockProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [hoveredDatum, setHoveredDatum] = useState<FloatingSpiderDatum | null>(
    null,
  );

  const chartGeometry = useMemo(() => {
    const total = Math.max(data.length, 3);
    const angleStep = (Math.PI * 2) / total;

    const points = data.map((entry, index) => {
      const angle = -Math.PI / 2 + angleStep * index;
      const normalized = Math.max(0, Math.min(entry.value / maxValue, 1));

      return {
        ...entry,
        angle,
        axisPoint: pointToString(angle, OUTER_RADIUS),
        valuePoint: pointToString(angle, OUTER_RADIUS * normalized),
        labelX: CENTER + Math.cos(angle) * LABEL_RADIUS,
        labelY: CENTER + Math.sin(angle) * LABEL_RADIUS,
      };
    });

    const ringPaths = Array.from({ length: GRID_LEVELS }, (_, index) => {
      const radius = OUTER_RADIUS * ((index + 1) / GRID_LEVELS);
      return points.map((point) => pointToString(point.angle, radius)).join(" ");
    });

    return {
      points,
      ringPaths,
      areaPath: points.map((point) => point.valuePoint).join(" "),
    };
  }, [data, maxValue]);

  return (
    <div className={styles.dock}>
      <AnimatePresence>
        {isOpen ? (
          <motion.div
            className={styles.card}
            initial={{ opacity: 0, y: -22, scale: 0.92, filter: "blur(8px)" }}
            animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -18, scale: 0.94, filter: "blur(8px)" }}
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className={styles.graphWrap}>
              {hoveredDatum ? (
                <div className={styles.hoverBadge}>
                  <span>{hoveredDatum.label}</span>
                  <strong>{hoveredDatum.value}%</strong>
                </div>
              ) : null}

              <svg
                viewBox={`0 0 ${SVG_SIZE} ${SVG_SIZE}`}
                className={styles.graph}
                aria-label="Spider graph"
                role="img"
              >
                <defs>
                  <linearGradient
                    id="floating-spider-fill"
                    x1="0%"
                    y1="0%"
                    x2="100%"
                    y2="100%"
                  >
                    <stop offset="0%" stopColor="rgba(120, 222, 255, 0.34)" />
                    <stop offset="100%" stopColor="rgba(255, 176, 107, 0.12)" />
                  </linearGradient>
                </defs>

                {chartGeometry.ringPaths.map((ringPath) => (
                  <polygon
                    key={ringPath}
                    points={ringPath}
                    className={styles.ring}
                  />
                ))}

                {chartGeometry.points.map((point) => (
                  <line
                    key={point.label}
                    x1={CENTER}
                    y1={CENTER}
                    x2={point.axisPoint.split(",")[0]}
                    y2={point.axisPoint.split(",")[1]}
                    className={styles.axis}
                  />
                ))}

                <polygon
                  points={chartGeometry.areaPath}
                  className={styles.area}
                />

                <polyline
                  points={`${chartGeometry.areaPath} ${chartGeometry.points[0]?.valuePoint ?? ""}`}
                  className={styles.line}
                />

                {chartGeometry.points.map((point) => {
                  const [x, y] = point.valuePoint.split(",");
                  return (
                    <circle
                      key={`${point.label}-point`}
                      cx={x}
                      cy={y}
                      r="4.2"
                      className={styles.node}
                      onMouseEnter={() => {
                        setHoveredDatum({
                          label: point.label,
                          value: point.value,
                        });
                      }}
                      onMouseLeave={() => {
                        setHoveredDatum(null);
                      }}
                    />
                  );
                })}

                {chartGeometry.points.map((point) => (
                  <text
                    key={`${point.label}-label`}
                    x={point.labelX}
                    y={point.labelY}
                    className={styles.label}
                    textAnchor={
                      point.labelX > CENTER + 16
                        ? "start"
                        : point.labelX < CENTER - 16
                          ? "end"
                          : "middle"
                    }
                    dominantBaseline="middle"
                    onMouseEnter={() => {
                      setHoveredDatum({
                        label: point.label,
                        value: point.value,
                      });
                    }}
                    onMouseLeave={() => {
                      setHoveredDatum(null);
                    }}
                  >
                    {point.label}
                  </text>
                ))}
              </svg>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <button
        type="button"
        className={styles.launcher}
        onClick={() => {
          setIsOpen((current) => !current);
        }}
        aria-expanded={isOpen}
        aria-label={isOpen ? "Close spider graph" : "Open spider graph"}
      >
        <svg
          viewBox="0 0 72 72"
          className={styles.launcherIcon}
          aria-hidden="true"
        >
          <polygon
            points="36,8 60,23 60,49 36,64 12,49 12,23"
            className={styles.launcherGrid}
          />
          <polygon
            points="36,18 49,26 49,46 36,54 23,46 23,26"
            className={styles.launcherShape}
          />
          <line x1="36" y1="8" x2="36" y2="64" className={styles.launcherAxis} />
          <line x1="12" y1="23" x2="60" y2="49" className={styles.launcherAxis} />
          <line x1="12" y1="49" x2="60" y2="23" className={styles.launcherAxis} />
        </svg>
      </button>
    </div>
  );
};

export default FloatingSpiderDock;
