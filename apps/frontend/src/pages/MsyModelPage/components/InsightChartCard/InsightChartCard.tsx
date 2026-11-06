import Button from "../../../../components/ui/Button/Button";
import { DialogTrigger, Dialog } from "react-aria-components";
import Popover from "../../../../components/ui/Popover/Popover";
import type { ReactNode } from "react";
import styles from "./InsightChartCard.module.css";

type InsightChartCardProps = {
  title: string;
  subtitle: string;
  hints: string[];
  children: ReactNode;
  height?: number;
};

const InsightChartCard = ({
  title,
  subtitle,
  hints,
  children,
  height = 340,
}: InsightChartCardProps) => {
  return (
    <div
      className={[styles["chart-card"], styles.paperLayout1]
        .filter(Boolean)
        .join(" ")}
    >
      <div className={styles.groupLayout2}>
        <div>
          <p
            className={[styles["chart-title"], styles.textLayout3]
              .filter(Boolean)
              .join(" ")}
          >
            {title}
          </p>
          <p className={styles["chart-subtitle"]}>{subtitle}</p>
        </div>

        <DialogTrigger>
          <Button variant="primary-outlined" size="sm">
            How to read
          </Button>
          <Popover>
            <Dialog aria-label={`How to read ${title}`}>
              <ul className={styles["chart-help-list"]}>
                {hints.map((hint, index) => (
                  <li key={index}>{hint}</li>
                ))}
              </ul>
            </Dialog>
          </Popover>
        </DialogTrigger>
      </div>

      <div className={styles["chart-stage"]} style={{ height }}>
        {children}
      </div>
    </div>
  );
};

export default InsightChartCard;
