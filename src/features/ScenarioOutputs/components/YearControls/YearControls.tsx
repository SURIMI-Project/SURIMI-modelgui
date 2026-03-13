import { useEffect, useMemo, useRef, useState } from "react";
import { FiPause, FiPlay } from "react-icons/fi";
import styles from "./YearControls.module.css";

type YearControlsProps = {
  years: number[];
  currentYear: number;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onSelectYear: (year: number) => void;
};

const WHEEL_SIZE = 308;
const CENTER = WHEEL_SIZE / 2;
const TICK_INNER_RADIUS = 120;
const TICK_OUTER_RADIUS = 138;
const LABEL_RADIUS = 154;
const RING_HIT_INNER = 106;
const RING_HIT_OUTER = 150;

const toRadians = (angle: number) => (angle * Math.PI) / 180;

const getAngleForIndex = (index: number, total: number) => {
  if (total <= 0) {
    return -90;
  }

  return -90 + (index / total) * 360;
};

const pointAt = (angle: number, radius: number) => {
  const radians = toRadians(angle);
  return {
    x: CENTER + Math.cos(radians) * radius,
    y: CENTER + Math.sin(radians) * radius,
  };
};

const YearControls = ({
  years,
  currentYear,
  isPlaying,
  onTogglePlay,
  onSelectYear,
}: YearControlsProps) => {
  const wheelRef = useRef<HTMLDivElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const yearAngles = useMemo(() => {
    return years.map((year, index) => ({
      year,
      index,
      angle: getAngleForIndex(index, years.length),
    }));
  }, [years]);

  const majorYears = useMemo(() => {
    const firstYear = years[0] ?? 0;
    const lastYear = years[years.length - 1] ?? 0;

    return yearAngles.filter(({ year }) => {
      return (
        year === firstYear || year === lastYear || (year - firstYear) % 10 === 0
      );
    });
  }, [yearAngles, years]);

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

    if (distance < RING_HIT_INNER || distance > RING_HIT_OUTER) {
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
  }, [isDragging]);

  return (
    <div className={styles.wrapper}>
      <div
        ref={wheelRef}
        className={styles.wheel}
        onPointerDown={(event) => {
          pickYearFromPointer(event.clientX, event.clientY);
          setIsDragging(true);
        }}
      >
        <svg
          className={styles.wheelSvg}
          viewBox={`0 0 ${WHEEL_SIZE} ${WHEEL_SIZE}`}
          aria-label="Year wheel"
          role="img"
        >
          <circle
            className={styles.outerHalo}
            cx={CENTER}
            cy={CENTER}
            r={146}
          />
          <circle
            className={styles.outerRing}
            cx={CENTER}
            cy={CENTER}
            r={139}
          />
          <circle
            className={styles.innerRing}
            cx={CENTER}
            cy={CENTER}
            r={106}
          />

          {yearAngles.map(({ year, angle }) => {
            const start = pointAt(angle, TICK_INNER_RADIUS);
            const end = pointAt(angle, TICK_OUTER_RADIUS);
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
            const position = pointAt(angle, LABEL_RADIUS);
            const isActive = year === currentYear;

            return (
              <text
                key={`label-${year}`}
                x={position.x}
                y={position.y}
                className={`${styles.yearLabel} ${isActive ? styles.yearLabelActive : ""}`}
                textAnchor="middle"
                dominantBaseline="middle"
              >
                {year}
              </text>
            );
          })}

          {(() => {
            const marker = pointAt(selectedAngle, 131);
            return (
              <>
                <line
                  x1={CENTER}
                  y1={CENTER}
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

      <p className={styles.hint}>Drag the outer ring or tap a year mark.</p>
    </div>
  );
};

export default YearControls;
