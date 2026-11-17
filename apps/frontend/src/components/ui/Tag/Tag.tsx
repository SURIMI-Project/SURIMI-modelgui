import type { HTMLAttributes } from "react";
import styles from "./Tag.module.css";
type Props = HTMLAttributes<HTMLSpanElement> & {
  dot?: boolean;
  tone?: "neutral" | "primary" | "secondary" | "success" | "danger";
};
export default function Tag({ tone = "neutral", dot = false, className, ...props }: Props) {
  return (
    <span
      {...props}
      data-tone={tone}
      data-dot={dot || undefined}
      className={`${styles.tag} ${className ?? ""}`}
    />
  );
}
