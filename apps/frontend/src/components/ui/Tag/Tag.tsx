import type { HTMLAttributes } from "react";
import styles from "./Tag.module.css";
type Props = HTMLAttributes<HTMLSpanElement> & {
  tone?: "neutral" | "primary" | "secondary" | "success" | "danger";
};
export default function Tag({ tone = "neutral", className, ...props }: Props) {
  return (
    <span
      {...props}
      data-tone={tone}
      className={`${styles.tag} ${className ?? ""}`}
    />
  );
}
