import type { ReactNode } from "react";
import styles from "./ChartCard.module.css";
type Props = {
  title: string;
  description: string;
  metricLabel?: string;
  valueLabel?: string;
  aside?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  className?: string;
  compact?: boolean;
};
export default function ChartCard({
  title,
  description,
  metricLabel,
  valueLabel,
  aside,
  footer,
  children,
  className,
  compact = false,
}: Props) {
  return (
    <section
      className={`${styles.card} ${className ?? ""}`}
      data-compact={compact || undefined}
    >
      <div className={styles.header}>
        <div>
          <p className={styles.kicker}>{title}</p>
          <h3>{description}</h3>
        </div>
        {aside ?? (
          <div className={styles.value}>
            <span>{metricLabel}</span>
            <strong>{valueLabel}</strong>
          </div>
        )}
      </div>
      <div className={styles.chart}>{children}</div>
      {footer ? <p className={styles.footer}>{footer}</p> : null}
    </section>
  );
}
