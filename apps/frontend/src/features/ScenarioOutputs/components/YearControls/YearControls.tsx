import { useEffect, useMemo, useRef, useState } from "react";
import { FiPause, FiPlay } from "react-icons/fi";
import styles from "./YearControls.module.css";

type YearControlsProps = {
  years: number[];
  currentYear: number;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onSelectYear: (year: number) => void;
  size?: number;
  showHint?: boolean;
};

const BASE_WHEEL_SIZE = 308;
const TICK_INNER_RATIO = 120 / BASE_WHEEL_SIZE;
const TICK_OUTER_RATIO = 138 / BASE_WHEEL_SIZE;
const LABEL_RATIO = 154 / BASE_WHEEL_SIZE;
const RING_HIT_INNER_RATIO = 106 / BASE_WHEEL_SIZE;
const RING_HIT_OUTER_RATIO = 150 / BASE_WHEEL_SIZE;
const OUTER_HALO_RATIO = 146 / BASE_WHEEL_SIZE;
const OUTER_RING_RATIO = 139 / BASE_WHEEL_SIZE;
const INNER_RING_RATIO = 106 / BASE_WHEEL_SIZE;
const MARKER_RATIO = 131 / BASE_WHEEL_SIZE;

const toRadians = (angle: number) => (angle * Math.PI) / 180;

const getAngleForIndex = (index: number, total: number) => {
  if (total <= 0) {
    return -90;
  }

  return -90 + (index / total) * 360;
};

const pointAt = (angle: number, radius: number, center: number) => {
  const radians = toRadians(angle);
  return {
    x: center + Math.cos(radians) * radius,
    y: center + Math.sin(radians) * radius,
  };
};

const YearControls = ({
  years,
  currentYear,
  isPlaying,
  onTogglePlay,
  onSelectYear,
  size = BASE_WHEEL_SIZE,
  showHint = true,
}: YearControlsProps) => {
  const wheelRef = useRef<HTMLDivElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const center = size / 2;
  const tickInnerRadius = size * TICK_INNER_RATIO;
  const tickOuterRadius = size * TICK_OUTER_RATIO;
  const labelRadius = size * LABEL_RATIO;
  const ringHitInner = size * RING_HIT_INNER_RATIO;
  const ringHitOuter = size * RING_HIT_OUTER_RATIO;
  const outerHaloRadius = size * OUTER_HALO_RATIO;
  const outerRingRadius = size * OUTER_RING_RATIO;
  const innerRingRadius = size * INNER_RING_RATIO;
  const markerRadius = size * MARKER_RATIO;

  const yearAngles = useMemo(() => {
    return years.map((year, index) => ({
      year,
      index,
      angle: getAngleForIndex(index, years.length),
    }));
  }, [years]);

  const majorYears = useMemo(() => {
    if (years.length === 0) {
      return [];
    }

    const indices = Array.from(
      new Set([
        0,
        Math.round((years.length - 1) * 0.25),
        Math.round((years.length - 1) * 0.5),
        Math.round((years.length - 1) * 0.75),
      ]),
    );

    return indices
      .map((index) => {
        const year = years[index];
        if (year === undefined) {
          return null;
        }

        return {
          year,
          index,
          angle: getAngleForIndex(index, years.length),
        };
      })
      .filter((value): value is NonNullable<typeof value> => value !== null);
  }, [years]);

  const selectedYearIndex = useMemo(() => {
    return years.findIndex((year) => year === currentYear);
  }, [currentYear, years]);

  const selectedAngle = getAngleForIndex(
    selectedYearIndex >= 0 ? selectedYearIndex : 0,
    years.length,
  );

  const pickYearFromPointer = (clientX: number, clientY: number) => {
    const element = wheelRef.current;
    if (!element || years.length === 0) {
      return;
    }

    const rect = element.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const dx = clientX - centerX;
    const dy = clientY - centerY;
    const distance = Math.hypot(dx, dy);

    if (distance < ringHitInner || distance > ringHitOuter) {
      return;
    }

    const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
    const normalized = (angle + 90 + 360) % 360;
    const index = Math.round((normalized / 360) * years.length) % years.length;
    const nextYear = years[index];

    if (nextYear !== undefined) {
      onSelectYear(nextYear);
    }
  };

  useEffect(() => {
    if (!isDragging) {
      return;
    }

    const handlePointerMove = (event: PointerEvent) => {
      pickYearFromPointer(event.clientX, event.clientY);
    };

    const handlePointerUp = () => {
      setIsDragging(false);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [isDragging, onSelectYear, ringHitInner, ringHitOuter, years]);

  return (
    <div className={styles.wrapper}>
      <div
        ref={wheelRef}
        className={styles.wheel}
        style={{ width: size, height: size }}
        onPointerDown={(event) => {
          pickYearFromPointer(event.clientX, event.clientY);
          setIsDragging(true);
        }}
      >
        <svg
          className={styles.wheelSvg}
          viewBox={`0 0 ${size} ${size}`}
          aria-label="Year wheel"
          role="img"
        >
          <circle className={styles.outerHalo} cx={center} cy={center} r={outerHaloRadius} />
          <circle className={styles.outerRing} cx={center} cy={center} r={outerRingRadius} />
          <circle className={styles.innerRing} cx={center} cy={center} r={innerRingRadius} />

          {yearAngles.map(({ year, angle }) => {
            const start = pointAt(angle, tickInnerRadius, center);
            const end = pointAt(angle, tickOuterRadius, center);
            const isActive = year === currentYear;
            const isMajor = majorYears.some((item) => item.year === year);

            return (
              <line
                key={year}
                x1={start.x}
                y1={start.y}
                x2={end.x}
                y2={end.y}
                className={[
                  styles.tick,
                  isMajor ? styles.tickMajor : "",
                  isActive ? styles.tickActive : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
              />
            );
          })}

          {majorYears.map(({ year, angle }) => {
            const position = pointAt(angle, labelRadius, center);

            return (
              <text
                key={`label-${year}`}
                x={position.x}
                y={position.y}
                className={styles.yearLabel}
                textAnchor="middle"
                dominantBaseline="middle"
              >
                {year}
              </text>
            );
          })}

          {(() => {
            const marker = pointAt(selectedAngle, markerRadius, center);
            return (
              <>
                <line
                  x1={center}
                  y1={center}
                  x2={marker.x}
                  y2={marker.y}
                  className={styles.yearNeedle}
                />
                <circle
                  cx={marker.x}
                  cy={marker.y}
                  r={6}
                  className={styles.yearMarker}
                />
              </>
            );
          })()}
        </svg>

        <button
          type="button"
          className={styles.centerHub}
          onPointerDown={(event) => {
            event.stopPropagation();
          }}
          onClick={(event) => {
            event.stopPropagation();
            onTogglePlay();
          }}
          aria-label={isPlaying ? "Pause timeline" : "Play timeline"}
        >
          <span className={styles.hubIcon}>
            {isPlaying ? <FiPause size={19} /> : <FiPlay size={19} />}
          </span>
          <span className={styles.hubYear}>{currentYear}</span>
        </button>
      </div>

      {showHint ? (
        <p className={styles.hint}>Drag the outer ring or tap a year mark.</p>
      ) : null}
    </div>
  );
};

export default YearControls;
