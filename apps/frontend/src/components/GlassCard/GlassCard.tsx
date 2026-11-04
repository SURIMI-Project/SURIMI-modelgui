import type { CSSProperties, ReactNode } from "react";
import styles from "./GlassCard.module.css";

export type GlassCardVariant = "western" | "aegean" | "anchovy";

type GlassCardProps = {
  children: ReactNode;
  variant: GlassCardVariant;
  className?: string;
  style?: CSSProperties;
};

const variantClassById: Record<GlassCardVariant, string> = {
  western: styles.variantWestern,
  aegean: styles.variantAegean,
  anchovy: styles.variantAnchovy,
};

const GlassCard = ({ children, variant, className, style }: GlassCardProps) => {
  const rootClassName = [styles.root, variantClassById[variant], className]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={rootClassName} style={style}>
      {children}
    </div>
  );
};

export default GlassCard;
