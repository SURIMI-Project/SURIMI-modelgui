import type { HTMLAttributes } from "react";
import styles from "./Card.module.css";
export default function Card({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return <div {...props} className={`${styles.card} ${className ?? ""}`} />;
}
