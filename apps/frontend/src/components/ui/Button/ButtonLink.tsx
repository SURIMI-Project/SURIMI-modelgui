import { Link, type LinkProps } from "react-router-dom";
import type { ButtonSize, ButtonVariant } from "./Button";
import styles from "../../../styles/aria/button/Button.module.css";

type Props = LinkProps & { variant?: ButtonVariant; size?: ButtonSize };

export default function ButtonLink({ variant = "primary-outlined", size = "md", className, ...props }: Props) {
  return <Link {...props} data-variant={variant} data-size={size}
    className={`${styles.button} ${className ?? ""}`} />;
}
