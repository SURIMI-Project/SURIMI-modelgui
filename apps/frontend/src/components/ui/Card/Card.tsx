import type { HTMLAttributes } from "react";
import styles from "./Card.module.css";

type Props = HTMLAttributes<HTMLDivElement> & { appearance?: "solid" | "glass" };
export default function Card({ appearance = "solid", className, ...props }: Props) {
  return <div {...props} data-appearance={appearance} className={`${styles.card} ${className ?? ""}`} />;
}
