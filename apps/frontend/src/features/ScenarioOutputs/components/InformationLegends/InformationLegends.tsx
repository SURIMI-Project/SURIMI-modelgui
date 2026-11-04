import type { CSSProperties } from "react";
import styles from "./InformationLegends.module.css";

export type InformationLegendItem = {
  label: string;
  description: string;
  marker: "line" | "band" | "dot" | "ring" | "divider";
  color?: string;
};

type InformationLegendsProps = {
  title?: string;
  items: InformationLegendItem[];
  className?: string;
};

const withAlpha = (hexColor: string, alpha: number) => {
  const normalized = hexColor.replace("#", "");
  const expanded =
    normalized.length === 3
      ? normalized
          .split("")
          .map((part) => `${part}${part}`)
          .join("")
      : normalized;

  if (expanded.length !== 6) {
    return `rgba(116, 219, 255, ${alpha})`;
  }

  const red = Number.parseInt(expanded.slice(0, 2), 16);
  const green = Number.parseInt(expanded.slice(2, 4), 16);
  const blue = Number.parseInt(expanded.slice(4, 6), 16);

  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
};

const InformationLegends = ({
  title = "Information Legends",
  items,
  className,
}: InformationLegendsProps) => {
  return (
    <section className={[styles.panel, className].filter(Boolean).join(" ")}>
      <p className={styles.title}>{title}</p>

      <div className={styles.list}>
        {items.map((item) => (
          <div key={item.label} className={styles.item}>
            {(() => {
              const style: CSSProperties | undefined = item.color
                ? ({
                    "--legend-color": item.color,
                    "--legend-color-soft": withAlpha(item.color, 0.22),
                    "--legend-color-strong": withAlpha(item.color, 0.54),
                  } as CSSProperties)
                : undefined;

              return (
                <span
                  className={[
                    styles.marker,
                    item.marker === "line" ? styles.markerLine : "",
                    item.marker === "band" ? styles.markerBand : "",
                    item.marker === "dot" ? styles.markerDot : "",
                    item.marker === "ring" ? styles.markerRing : "",
                    item.marker === "divider" ? styles.markerDivider : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  style={style}
                  aria-hidden="true"
                />
              );
            })()}
            <div className={styles.copy}>
              <strong>{item.label}</strong>
              <span>{item.description}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default InformationLegends;
